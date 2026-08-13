from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_transaction_or_404
from app.api.presenters import ingestion_response, transaction_response
from app.auth.dependencies import AuthenticatedSession, get_authenticated_session, require_csrf
from app.database.session import get_db
from app.models import LedgerTransaction
from app.models.enums import ReviewStatus, TransactionSource, TransactionType
from app.schemas.transaction import (
    IngestionResponse,
    ManualTransactionRequest,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.ingestion import ingest_manual
from app.services.merchant_normalization import normalize_merchant
from app.services.money import to_minor_units


router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


def _detail_query():
    return select(LedgerTransaction).options(
        selectinload(LedgerTransaction.category),
        selectinload(LedgerTransaction.payment_method),
    )


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    search: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    transaction_type: TransactionType | None = Query(default=None, alias="type"),
    category_id: str | None = None,
    payment_method_id: str | None = None,
    source: TransactionSource | None = None,
    review_status: ReviewStatus | None = None,
    currency: str | None = None,
    min_amount_minor: int | None = None,
    max_amount_minor: int | None = None,
    sort: str = Query(default="newest", pattern="^(newest|oldest|amount_high|amount_low)$"),
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
) -> TransactionListResponse:
    filters = []
    if search:
        needle = f"%{search.strip()}%"
        filters.append(
            or_(
                LedgerTransaction.merchant_raw.ilike(needle),
                LedgerTransaction.merchant_normalized.ilike(needle),
                LedgerTransaction.note.ilike(needle),
                LedgerTransaction.purpose.ilike(needle),
            )
        )
    if date_from:
        filters.append(LedgerTransaction.transaction_date >= date_from)
    if date_to:
        filters.append(LedgerTransaction.transaction_date <= date_to)
    if transaction_type:
        filters.append(LedgerTransaction.type == transaction_type)
    if category_id:
        filters.append(LedgerTransaction.category_id == category_id)
    if payment_method_id:
        filters.append(LedgerTransaction.payment_method_id == payment_method_id)
    if source:
        filters.append(LedgerTransaction.source == source)
    if review_status:
        filters.append(LedgerTransaction.review_status == review_status)
    if currency:
        filters.append(LedgerTransaction.currency_code == currency.upper())
    if min_amount_minor is not None:
        filters.append(LedgerTransaction.amount_minor >= min_amount_minor)
    if max_amount_minor is not None:
        filters.append(LedgerTransaction.amount_minor <= max_amount_minor)

    order_by = {
        "newest": LedgerTransaction.transaction_date.desc(),
        "oldest": LedgerTransaction.transaction_date.asc(),
        "amount_high": LedgerTransaction.amount_minor.desc(),
        "amount_low": LedgerTransaction.amount_minor.asc(),
    }[sort]
    total = database.scalar(
        select(func.count()).select_from(LedgerTransaction).where(*filters)
    ) or 0
    items = database.scalars(
        _detail_query()
        .where(*filters)
        .order_by(order_by, LedgerTransaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return TransactionListResponse(
        items=[transaction_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=IngestionResponse, status_code=201)
def create_transaction(
    payload: ManualTransactionRequest,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
) -> IngestionResponse:
    return ingestion_response(ingest_manual(database, payload))


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
) -> TransactionResponse:
    transaction = database.scalar(
        _detail_query().where(LedgerTransaction.id == transaction_id)
    )
    if transaction is None:
        get_transaction_or_404(database, transaction_id)
    return transaction_response(transaction)


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
) -> TransactionResponse:
    transaction = get_transaction_or_404(database, transaction_id)
    changes = payload.model_dump(exclude_unset=True)
    amount = changes.pop("amount", None)
    currency = changes.pop("currency", None)
    merchant = changes.pop("merchant", None)
    if currency is not None:
        transaction.currency_code = currency
    if amount is not None:
        transaction.amount_minor = to_minor_units(amount, transaction.currency_code)
    if merchant is not None:
        transaction.merchant_raw = merchant
        transaction.merchant_normalized = normalize_merchant(merchant)
    for field, value in changes.items():
        setattr(transaction, field, value)
    database.commit()
    transaction = database.scalar(
        _detail_query().where(LedgerTransaction.id == transaction_id)
    )
    return transaction_response(transaction)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
) -> Response:
    transaction = get_transaction_or_404(database, transaction_id)
    database.delete(transaction)
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
