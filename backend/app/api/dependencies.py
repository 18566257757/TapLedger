from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import LedgerTransaction


def get_transaction_or_404(database: Session, transaction_id: str) -> LedgerTransaction:
    transaction = database.get(LedgerTransaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return transaction
