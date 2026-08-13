from __future__ import annotations

from app.models import LedgerTransaction
from app.schemas.transaction import IngestionResponse, TransactionResponse
from app.services.ingestion import IngestionResult
from app.services.money import from_minor_units


def transaction_response(transaction: LedgerTransaction) -> TransactionResponse:
    return TransactionResponse(
        id=transaction.id,
        client_event_id=transaction.client_event_id,
        type=transaction.type,
        amount=str(from_minor_units(transaction.amount_minor, transaction.currency_code)),
        amount_minor=transaction.amount_minor,
        currency=transaction.currency_code,
        transaction_date=transaction.transaction_date,
        captured_at=transaction.captured_at,
        merchant_raw=transaction.merchant_raw,
        merchant_normalized=transaction.merchant_normalized,
        card_raw_name=transaction.card_raw_name,
        category_id=transaction.category_id,
        category_name=transaction.category.name if transaction.category else None,
        payment_method_id=transaction.payment_method_id,
        payment_method_name=(
            transaction.payment_method.display_name if transaction.payment_method else None
        ),
        purpose=transaction.purpose,
        note=transaction.note,
        location_name=transaction.location_name,
        latitude=transaction.latitude,
        longitude=transaction.longitude,
        source=transaction.source,
        review_status=transaction.review_status,
        is_excluded_from_analytics=transaction.is_excluded_from_analytics,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


def ingestion_response(result: IngestionResult) -> IngestionResponse:
    transaction = result.transaction
    return IngestionResponse(
        result=result.result,
        transaction_id=transaction.id,
        category=transaction.category.name if transaction.category else None,
        review_status=transaction.review_status,
        duplicate=result.duplicate,
    )
