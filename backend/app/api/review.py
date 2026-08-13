from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_transaction_or_404
from app.api.presenters import transaction_response
from app.auth.dependencies import AuthenticatedSession, get_authenticated_session, require_csrf
from app.database.session import get_db
from app.models import LedgerTransaction, MerchantRule
from app.models.enums import MerchantMatchType, ReviewStatus
from app.schemas.catalog import MerchantRuleCreate
from app.schemas.transaction import TransactionResponse
from app.services.rule_engine import normalized_rule_pattern


router = APIRouter(prefix="/api/v1/review", tags=["review"])


@router.get("", response_model=list[TransactionResponse])
def list_review_items(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    items = database.scalars(
        select(LedgerTransaction)
        .options(
            selectinload(LedgerTransaction.category),
            selectinload(LedgerTransaction.payment_method),
        )
        .where(LedgerTransaction.review_status != ReviewStatus.CONFIRMED)
        .order_by(LedgerTransaction.transaction_date.desc())
    ).all()
    return [transaction_response(item) for item in items]


@router.post("/{transaction_id}/confirm", response_model=TransactionResponse)
def confirm_review_item(
    transaction_id: str,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = get_transaction_or_404(database, transaction_id)
    item.review_status = ReviewStatus.CONFIRMED
    database.commit()
    database.refresh(item)
    return transaction_response(item)


@router.post("/{transaction_id}/mark-not-duplicate", response_model=TransactionResponse)
def mark_not_duplicate(
    transaction_id: str,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    return confirm_review_item(transaction_id, _authenticated, database)


@router.post("/{transaction_id}/create-rule", response_model=TransactionResponse)
def create_rule_for_review_item(
    transaction_id: str,
    payload: MerchantRuleCreate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = get_transaction_or_404(database, transaction_id)
    pattern = payload.pattern or item.merchant_normalized
    database.add(
        MerchantRule(
            pattern=pattern,
            normalized_pattern=normalized_rule_pattern(pattern, payload.match_type),
            match_type=payload.match_type,
            priority=payload.priority,
            category_id=payload.category_id or item.category_id,
            payment_method_id=payload.payment_method_id or item.payment_method_id,
            default_purpose=payload.default_purpose,
            is_enabled=payload.is_enabled,
        )
    )
    item.review_status = ReviewStatus.CONFIRMED
    database.commit()
    database.refresh(item)
    return transaction_response(item)


@router.post("/{transaction_id}/delete-duplicate", status_code=204)
def delete_duplicate(
    transaction_id: str,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = get_transaction_or_404(database, transaction_id)
    database.delete(item)
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
