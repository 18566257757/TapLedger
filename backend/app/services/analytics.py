"""Currency-safe analytics helpers."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import LedgerTransaction
from app.models.enums import TransactionType


def eligible_query(date_from: datetime, date_to: datetime):
    return (
        select(LedgerTransaction)
        .options(
            selectinload(LedgerTransaction.category),
            selectinload(LedgerTransaction.payment_method),
        )
        .where(
            LedgerTransaction.transaction_date >= date_from,
            LedgerTransaction.transaction_date < date_to,
            LedgerTransaction.is_excluded_from_analytics.is_(False),
            LedgerTransaction.type.in_(
                [TransactionType.EXPENSE, TransactionType.REFUND]
            ),
        )
    )


def signed_spending(transaction: LedgerTransaction) -> int:
    if transaction.type == TransactionType.EXPENSE:
        return transaction.amount_minor
    if transaction.type == TransactionType.REFUND:
        return -transaction.amount_minor
    return 0


def summary_by_currency(
    database: Session, date_from: datetime, date_to: datetime
) -> dict[str, dict[str, int]]:
    totals: dict[str, dict[str, int]] = defaultdict(
        lambda: {"net_spending_minor": 0, "transaction_count": 0, "largest_minor": 0}
    )
    for transaction in database.scalars(eligible_query(date_from, date_to)).all():
        bucket = totals[transaction.currency_code]
        signed = signed_spending(transaction)
        bucket["net_spending_minor"] += signed
        bucket["transaction_count"] += 1
        if transaction.type == TransactionType.EXPENSE:
            bucket["largest_minor"] = max(
                bucket["largest_minor"], transaction.amount_minor
            )
    return dict(totals)


def ranked_breakdown(
    database: Session,
    date_from: datetime,
    date_to: datetime,
    dimension: str,
) -> list[dict[str, str | int]]:
    totals: dict[tuple[str, str], int] = defaultdict(int)
    for transaction in database.scalars(eligible_query(date_from, date_to)).all():
        label = {
            "category": transaction.category.name if transaction.category else "Uncategorized",
            "merchant": transaction.merchant_normalized,
            "payment_method": (
                transaction.payment_method.display_name
                if transaction.payment_method
                else "Unmapped"
            ),
        }[dimension]
        totals[(transaction.currency_code, label)] += signed_spending(transaction)
    return [
        {"currency": currency, "label": label, "amount_minor": amount}
        for (currency, label), amount in sorted(
            totals.items(), key=lambda item: item[1], reverse=True
        )
    ]


def trend_by_day(
    database: Session, date_from: datetime, date_to: datetime
) -> list[dict[str, str | int]]:
    totals: dict[tuple[str, str], int] = defaultdict(int)
    for transaction in database.scalars(eligible_query(date_from, date_to)).all():
        day = transaction.transaction_date.date().isoformat()
        totals[(transaction.currency_code, day)] += signed_spending(transaction)
    return [
        {"currency": currency, "date": day, "amount_minor": amount}
        for (currency, day), amount in sorted(totals.items())
    ]
