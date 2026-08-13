from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import require_shortcut_token
from app.database.session import get_db
from app.models.enums import TransactionSource
from app.schemas.transaction import (
    BatchIngestionResponse,
    IngestionResponse,
    ShortcutBatchRequest,
    ShortcutTransactionRequest,
)
from app.services.ingestion import ingest_shortcut
from app.api.presenters import ingestion_response


router = APIRouter(
    prefix="/api/v1/shortcut",
    tags=["shortcut"],
    dependencies=[Depends(require_shortcut_token)],
)


@router.post("/test")
def test_shortcut() -> dict[str, bool]:
    return {"success": True}


@router.post("/transactions", response_model=IngestionResponse)
def create_shortcut_transaction(
    payload: ShortcutTransactionRequest,
    request: Request,
    database: Session = Depends(get_db),
) -> IngestionResponse:
    identity = request.headers.get("Tailscale-User-Login")
    return ingestion_response(
        ingest_shortcut(database, payload, request_identity=identity)
    )


@router.post("/transactions/batch", response_model=BatchIngestionResponse)
def create_shortcut_transactions(
    payload: ShortcutBatchRequest,
    request: Request,
    database: Session = Depends(get_db),
) -> BatchIngestionResponse:
    identity = request.headers.get("Tailscale-User-Login")
    results = [
        ingestion_response(
            ingest_shortcut(database, item, request_identity=identity)
        )
        for item in payload.transactions
    ]
    return BatchIngestionResponse(
        results=results,
        created=sum(item.result.startswith("created") for item in results),
        duplicates=sum(item.duplicate for item in results),
        failed=0,
    )


@router.post("/simulate", response_model=IngestionResponse)
def simulate_transaction(
    payload: ShortcutTransactionRequest,
    database: Session = Depends(get_db),
) -> IngestionResponse:
    return ingestion_response(
        ingest_shortcut(
            database,
            payload,
            source=TransactionSource.SIMULATOR,
            request_identity="local-simulator",
        )
    )
