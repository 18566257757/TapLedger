from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthenticatedSession, get_authenticated_session, require_csrf
from app.auth.security import hash_token, new_secret
from app.auth.service import AuthenticationError, authenticate
from app.api.presenters import ingestion_response
from app import __version__
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models import AppSetting, Category, ImportEvent, LedgerTransaction, MerchantRule, PaymentMethod
from app.models.enums import ReviewStatus
from app.models.enums import TransactionSource
from app.schemas.transaction import IngestionResponse, ShortcutTransactionRequest
from app.services.backup import BackupError, create_backup, validate_backup
from app.services.ingestion import ingest_shortcut


router = APIRouter(prefix="/api/v1", tags=["administration"])
PROCESS_STARTED_AT = datetime.now(UTC)


class RotateTokenResponse(BaseModel):
    token: str
    warning: str = "Copy this token now. It will not be shown again."


class BackupValidationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=256)


class SimulationRequest(BaseModel):
    amount: str = Field(default="12.50", min_length=1, max_length=40)
    currency: str = Field(default="HKD", min_length=3, max_length=3)
    merchant: str = Field(default="TapLedger Test Merchant", min_length=1, max_length=500)


class DeleteAllDataRequest(BaseModel):
    password: str = Field(min_length=1, max_length=256)
    confirmation: str


@router.get("/status")
def detailed_status(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    database.execute(text("SELECT 1"))
    latest_import = database.scalar(
        select(ImportEvent).order_by(ImportEvent.received_at.desc()).limit(1)
    )
    pending = database.scalar(
        select(func.count())
        .select_from(LedgerTransaction)
        .where(LedgerTransaction.review_status != ReviewStatus.CONFIRMED)
    ) or 0
    backup_items = (
        sorted(settings.paths.backups.glob("tapledger-*.sqlite3"), reverse=True)
        if settings.paths.backups.exists()
        else []
    )
    return {
        "service_health": "ok",
        "database_health": "ok",
        "database_path": str(settings.paths.database),
        "database_size": (
            settings.paths.database.stat().st_size
            if settings.paths.database.exists()
            else 0
        ),
        "tailscale_url": settings.tailscale_base_url,
        "last_import": latest_import.received_at if latest_import else None,
        "recent_import_result": latest_import.result if latest_import else None,
        "pending_reviews": pending,
        "last_backup": backup_items[0].name if backup_items else None,
        "version": __version__,
        "uptime_seconds": int((datetime.now(UTC) - PROCESS_STARTED_AT).total_seconds()),
    }


@router.get("/automation/import-events")
def recent_import_events(
    limit: int = 10,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 50)
    items = database.scalars(
        select(ImportEvent).order_by(ImportEvent.received_at.desc()).limit(limit)
    ).all()
    return {
        "items": [
            {
                "id": item.id,
                "client_event_id": item.client_event_id,
                "received_at": item.received_at,
                "result": item.result,
                "merchant_summary": item.merchant_summary,
                "amount_summary": item.amount_summary,
                "source": item.source,
            }
            for item in items
        ]
    }


@router.post("/automation/token/rotate", response_model=RotateTokenResponse)
def rotate_shortcut_token(
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    token = new_secret(32)
    app_settings = database.get(AppSetting, 1) or AppSetting(id=1)
    database.add(app_settings)
    app_settings.shortcut_token_hash = hash_token(token)
    database.commit()
    return RotateTokenResponse(token=token)


@router.post("/automation/simulate", response_model=IngestionResponse)
def simulate_import(
    payload: SimulationRequest,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    now = datetime.now(UTC)
    request = ShortcutTransactionRequest(
        client_event_id=f"sim-{uuid.uuid4()}",
        amount=payload.amount,
        currency=payload.currency,
        merchant=payload.merchant,
        transaction_date=now,
        captured_at=now,
        source=TransactionSource.SIMULATOR,
    )
    return ingestion_response(
        ingest_shortcut(database, request, source=TransactionSource.SIMULATOR, request_identity="local-simulator")
    )


@router.post("/admin/backup")
def create_database_backup(
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    settings: Settings = Depends(get_settings),
):
    try:
        result = create_backup(settings)
    except BackupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"name": result.path.name, "size_bytes": result.size_bytes, "sha256": result.sha256}


@router.get("/admin/backups")
def list_backups(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    settings: Settings = Depends(get_settings),
):
    if not settings.paths.backups.exists():
        return {"items": []}
    return {
        "items": [
            {"name": item.name, "size_bytes": item.stat().st_size}
            for item in sorted(
                settings.paths.backups.glob("tapledger-*.sqlite3"), reverse=True
            )
        ]
    }


@router.post("/admin/restore/validate")
def validate_database_backup(
    payload: BackupValidationRequest,
    authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    try:
        authenticate(database, authenticated.user.username, payload.password)
        return validate_backup(settings.paths.backups / payload.name, settings.paths.backups)
    except (BackupError, ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/admin/delete-all-data")
def delete_all_financial_data(
    payload: DeleteAllDataRequest,
    authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if payload.confirmation != "DELETE ALL DATA":
        raise HTTPException(status_code=400, detail="Confirmation text does not match")
    try:
        authenticate(database, authenticated.user.username, payload.password)
        backup = create_backup(settings)
    except (AuthenticationError, BackupError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    deleted_transactions = database.scalar(
        select(func.count()).select_from(LedgerTransaction)
    ) or 0
    database.execute(delete(ImportEvent))
    database.execute(delete(MerchantRule))
    database.execute(delete(LedgerTransaction))
    database.execute(delete(PaymentMethod))
    database.execute(delete(Category).where(Category.is_system.is_(False)))
    database.commit()
    return {
        "deleted_transactions": deleted_transactions,
        "backup_name": backup.path.name,
    }
