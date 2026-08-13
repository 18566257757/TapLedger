"""Unified transaction ingestion service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.base import utc_now
from app.models import (
    AppSetting,
    Category,
    ImportEvent,
    LedgerTransaction,
    PaymentMethod,
)
from app.models.enums import ReviewStatus, TransactionSource, TransactionType
from app.schemas.transaction import ManualTransactionRequest, ShortcutTransactionRequest
from app.services.duplicate import build_deduplication_key, detect_duplicate
from app.services.merchant_normalization import normalize_merchant
from app.services.money import to_minor_units
from app.services.rule_engine import find_matching_rule


@dataclass(frozen=True, slots=True)
class IngestionResult:
    result: str
    transaction: LedgerTransaction
    duplicate: bool


def _app_settings(database: Session) -> AppSetting:
    settings = database.get(AppSetting, 1)
    if settings is None:
        settings = AppSetting(id=1)
        database.add(settings)
        database.flush()
    return settings


def _as_utc(value: datetime, timezone_name: str) -> datetime:
    if value.tzinfo is None:
        try:
            value = value.replace(tzinfo=ZoneInfo(timezone_name))
        except ZoneInfoNotFoundError:
            value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _match_payment_method(database: Session, card_raw_name: str | None) -> PaymentMethod | None:
    if not card_raw_name:
        return None
    normalized_card = card_raw_name.strip().upper()
    candidates = database.scalars(
        select(PaymentMethod).where(
            PaymentMethod.is_archived.is_(False),
            PaymentMethod.shortcut_match_text.is_not(None),
        )
    ).all()
    for method in candidates:
        match_text = (method.shortcut_match_text or "").strip().upper()
        if match_text and match_text in normalized_card:
            return method
    return None


def _historical_category_id(
    database: Session, normalized_merchant: str
) -> str | None:
    return database.scalar(
        select(LedgerTransaction.category_id)
        .where(
            LedgerTransaction.merchant_normalized == normalized_merchant,
            LedgerTransaction.category_id.is_not(None),
            LedgerTransaction.review_status == ReviewStatus.CONFIRMED,
        )
        .order_by(LedgerTransaction.transaction_date.desc())
        .limit(1)
    )


def _uncategorized_id(database: Session) -> str:
    category_id = database.scalar(
        select(Category.id).where(Category.name == "Uncategorized")
    )
    if category_id is None:
        category = Category(
            name="Uncategorized",
            icon="circle-help",
            sort_order=999,
            is_system=True,
        )
        database.add(category)
        database.flush()
        return category.id
    return category_id


def _record_import_event(
    database: Session,
    *,
    client_event_id: str,
    result: str,
    transaction: LedgerTransaction | None,
    merchant_normalized: str,
    amount_minor: int,
    currency_code: str,
    source: TransactionSource,
    request_identity: str | None,
) -> None:
    database.add(
        ImportEvent(
            client_event_id=client_event_id,
            result=result,
            transaction_id=transaction.id if transaction else None,
            merchant_summary=merchant_normalized[:80],
            amount_summary=f"{amount_minor}:{currency_code}",
            source=source.value,
            request_identity=(request_identity or "")[:160] or None,
        )
    )


def ingest_shortcut(
    database: Session,
    payload: ShortcutTransactionRequest,
    *,
    source: TransactionSource = TransactionSource.WALLET_SHORTCUT,
    request_identity: str | None = None,
) -> IngestionResult:
    app_settings = _app_settings(database)
    currency = payload.currency or app_settings.base_currency
    transaction_date = _as_utc(
        payload.transaction_date or payload.captured_at or utc_now(),
        app_settings.timezone,
    )
    captured_at = _as_utc(payload.captured_at or utc_now(), app_settings.timezone)
    return _ingest(
        database,
        client_event_id=payload.client_event_id,
        transaction_type=TransactionType.EXPENSE,
        amount=payload.amount,
        currency=currency,
        merchant_raw=payload.merchant,
        card_raw_name=payload.card,
        transaction_date=transaction_date,
        captured_at=captured_at,
        source=source,
        category_id=None,
        payment_method_id=None,
        purpose=payload.purpose,
        note=None,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_excluded_from_analytics=False,
        request_identity=request_identity,
    )


def ingest_manual(
    database: Session,
    payload: ManualTransactionRequest,
) -> IngestionResult:
    app_settings = _app_settings(database)
    return _ingest(
        database,
        client_event_id=payload.client_event_id,
        transaction_type=payload.type,
        amount=payload.amount,
        currency=payload.currency,
        merchant_raw=payload.merchant,
        card_raw_name=None,
        transaction_date=_as_utc(payload.transaction_date, app_settings.timezone),
        captured_at=utc_now(),
        source=TransactionSource.MANUAL_PWA,
        category_id=payload.category_id,
        payment_method_id=payload.payment_method_id,
        purpose=payload.purpose,
        note=payload.note,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_excluded_from_analytics=payload.is_excluded_from_analytics,
        request_identity="local-admin",
    )


def _ingest(
    database: Session,
    *,
    client_event_id: str,
    transaction_type: TransactionType,
    amount: str,
    currency: str,
    merchant_raw: str | None,
    card_raw_name: str | None,
    transaction_date: datetime,
    captured_at: datetime,
    source: TransactionSource,
    category_id: str | None,
    payment_method_id: str | None,
    purpose: str | None,
    note: str | None,
    location_name: str | None,
    latitude: Decimal | None,
    longitude: Decimal | None,
    is_excluded_from_analytics: bool,
    request_identity: str | None,
) -> IngestionResult:
    existing = database.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.client_event_id == client_event_id
        )
    )
    if existing is not None:
        _record_import_event(
            database,
            client_event_id=client_event_id,
            result="already_processed",
            transaction=existing,
            merchant_normalized=existing.merchant_normalized,
            amount_minor=existing.amount_minor,
            currency_code=existing.currency_code,
            source=source,
            request_identity=request_identity,
        )
        database.commit()
        return IngestionResult("already_processed", existing, True)

    currency_code = currency.strip().upper()
    amount_minor = to_minor_units(amount, currency_code)
    effective_merchant = (merchant_raw or "").strip() or "Unknown Merchant"
    normalized_merchant = normalize_merchant(effective_merchant)
    payment_method = (
        database.get(PaymentMethod, payment_method_id)
        if payment_method_id
        else _match_payment_method(database, card_raw_name)
    )
    rule = find_matching_rule(database, normalized_merchant)

    effective_category_id = category_id
    effective_payment_method_id = payment_method.id if payment_method else None
    effective_purpose = purpose
    if rule is not None:
        effective_category_id = effective_category_id or rule.category_id
        effective_payment_method_id = (
            effective_payment_method_id or rule.payment_method_id
        )
        effective_purpose = effective_purpose or rule.default_purpose
    if effective_category_id is None:
        effective_category_id = _historical_category_id(database, normalized_merchant)
    categorized = effective_category_id is not None
    if effective_category_id is None:
        effective_category_id = _uncategorized_id(database)

    card_identity = effective_payment_method_id or card_raw_name
    deduplication_key = build_deduplication_key(
        normalized_merchant, amount_minor, currency_code, card_identity
    )
    duplicate = detect_duplicate(database, deduplication_key, transaction_date)
    if duplicate.is_automatic_duplicate and duplicate.existing is not None:
        _record_import_event(
            database,
            client_event_id=client_event_id,
            result="duplicate",
            transaction=duplicate.existing,
            merchant_normalized=normalized_merchant,
            amount_minor=amount_minor,
            currency_code=currency_code,
            source=source,
            request_identity=request_identity,
        )
        database.commit()
        return IngestionResult("already_processed", duplicate.existing, True)

    missing_shortcut_information = source in {
        TransactionSource.WALLET_SHORTCUT,
        TransactionSource.SIMULATOR,
    } and (
        merchant_raw is None
        or not merchant_raw.strip()
        or not card_raw_name
        or payment_method is None
    )
    if duplicate.is_candidate:
        review_status = ReviewStatus.DUPLICATE_CANDIDATE
    elif missing_shortcut_information:
        review_status = ReviewStatus.MISSING_INFORMATION
    elif not categorized:
        review_status = ReviewStatus.NEEDS_REVIEW
    else:
        review_status = ReviewStatus.CONFIRMED

    transaction = LedgerTransaction(
        client_event_id=client_event_id,
        type=transaction_type,
        amount_minor=amount_minor,
        currency_code=currency_code,
        transaction_date=transaction_date,
        captured_at=captured_at,
        merchant_raw=effective_merchant,
        merchant_normalized=normalized_merchant,
        card_raw_name=card_raw_name,
        category_id=effective_category_id,
        payment_method_id=effective_payment_method_id,
        purpose=effective_purpose,
        note=note,
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
        location_source="shortcut" if source == TransactionSource.WALLET_SHORTCUT else None,
        source=source,
        review_status=review_status,
        is_excluded_from_analytics=is_excluded_from_analytics,
        deduplication_key=deduplication_key,
    )
    database.add(transaction)
    database.flush()
    result_name = (
        "created_needs_review"
        if review_status != ReviewStatus.CONFIRMED
        else "created"
    )
    _record_import_event(
        database,
        client_event_id=client_event_id,
        result=result_name,
        transaction=transaction,
        merchant_normalized=normalized_merchant,
        amount_minor=amount_minor,
        currency_code=currency_code,
        source=source,
        request_identity=request_identity,
    )
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raced = database.scalar(
            select(LedgerTransaction).where(
                LedgerTransaction.client_event_id == client_event_id
            )
        )
        if raced is None:
            raise
        _record_import_event(
            database,
            client_event_id=client_event_id,
            result="already_processed",
            transaction=raced,
            merchant_normalized=raced.merchant_normalized,
            amount_minor=raced.amount_minor,
            currency_code=raced.currency_code,
            source=source,
            request_identity=request_identity,
        )
        database.commit()
        return IngestionResult("already_processed", raced, True)
    database.refresh(transaction)
    return IngestionResult(result_name, transaction, False)
