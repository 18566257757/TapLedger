from __future__ import annotations

import csv
import io
import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.presenters import transaction_response
from app.models import LedgerTransaction


CSV_FIELDS = (
    "id",
    "client_event_id",
    "transaction_date",
    "captured_at",
    "type",
    "amount",
    "amount_minor",
    "currency",
    "merchant_raw",
    "merchant_normalized",
    "category",
    "payment_method",
    "card_raw_name",
    "purpose",
    "location_name",
    "latitude",
    "longitude",
    "source",
    "review_status",
    "is_excluded_from_analytics",
    "note",
    "created_at",
    "updated_at",
)


def _transactions(database: Session) -> list[LedgerTransaction]:
    return list(
        database.scalars(
            select(LedgerTransaction)
            .options(
                selectinload(LedgerTransaction.category),
                selectinload(LedgerTransaction.payment_method),
            )
            .order_by(LedgerTransaction.transaction_date.desc())
        ).all()
    )


def export_csv(database: Session) -> str:
    output = io.StringIO(newline="")
    output.write("\ufeff")
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for transaction in _transactions(database):
        response = transaction_response(transaction)
        writer.writerow(
            {
                "id": response.id,
                "client_event_id": response.client_event_id,
                "transaction_date": response.transaction_date.isoformat(),
                "captured_at": response.captured_at.isoformat(),
                "type": response.type.value,
                "amount": response.amount,
                "amount_minor": response.amount_minor,
                "currency": response.currency,
                "merchant_raw": response.merchant_raw,
                "merchant_normalized": response.merchant_normalized,
                "category": response.category_name or "",
                "payment_method": response.payment_method_name or "",
                "card_raw_name": response.card_raw_name or "",
                "purpose": response.purpose or "",
                "location_name": response.location_name or "",
                "latitude": response.latitude if response.latitude is not None else "",
                "longitude": response.longitude if response.longitude is not None else "",
                "source": response.source.value,
                "review_status": response.review_status.value,
                "is_excluded_from_analytics": response.is_excluded_from_analytics,
                "note": response.note or "",
                "created_at": response.created_at.isoformat(),
                "updated_at": response.updated_at.isoformat(),
            }
        )
    return output.getvalue()


def export_json(database: Session) -> str:
    payload = [
        transaction_response(transaction).model_dump(mode="json")
        for transaction in _transactions(database)
    ]
    return json.dumps(payload, ensure_ascii=False, indent=2)
