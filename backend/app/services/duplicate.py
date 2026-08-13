"""Short-window duplicate detection."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LedgerTransaction


@dataclass(frozen=True, slots=True)
class DuplicateDecision:
    existing: LedgerTransaction | None
    is_automatic_duplicate: bool
    is_candidate: bool


def _utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def build_deduplication_key(
    merchant_normalized: str,
    amount_minor: int,
    currency_code: str,
    card_identity: str | None,
) -> str:
    material = "\x1f".join(
        (
            merchant_normalized,
            str(amount_minor),
            currency_code,
            (card_identity or "").strip().upper(),
        )
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def detect_duplicate(
    database: Session,
    deduplication_key: str,
    transaction_date: datetime,
) -> DuplicateDecision:
    window_start = transaction_date - timedelta(minutes=5)
    recent = database.scalars(
        select(LedgerTransaction)
        .where(
            LedgerTransaction.deduplication_key == deduplication_key,
            LedgerTransaction.transaction_date >= window_start,
            LedgerTransaction.transaction_date <= transaction_date,
        )
        .order_by(LedgerTransaction.transaction_date.desc())
    ).first()
    if recent is None:
        return DuplicateDecision(None, False, False)

    delta = _utc_aware(transaction_date) - _utc_aware(recent.transaction_date)
    seconds = abs(delta.total_seconds())
    if seconds <= 30:
        return DuplicateDecision(recent, True, False)
    if seconds <= 300:
        return DuplicateDecision(recent, False, True)
    return DuplicateDecision(None, False, False)
