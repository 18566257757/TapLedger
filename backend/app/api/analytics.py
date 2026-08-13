from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthenticatedSession, get_authenticated_session
from app.database.session import get_db
from app.services.analytics import ranked_breakdown, summary_by_currency, trend_by_day


router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/summary")
def summary(
    date_from: datetime,
    date_to: datetime,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    totals = summary_by_currency(database, date_from, date_to)
    return {
        "multiple_currencies": len(totals) > 1,
        "currencies": [
            {"currency": currency, **values} for currency, values in totals.items()
        ],
    }


@router.get("/trend")
def trend(
    date_from: datetime,
    date_to: datetime,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    return {"items": trend_by_day(database, date_from, date_to)}


def _breakdown(
    dimension: str,
    date_from: datetime,
    date_to: datetime,
    database: Session,
):
    return {"items": ranked_breakdown(database, date_from, date_to, dimension)}


@router.get("/categories")
def categories(
    date_from: datetime,
    date_to: datetime,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    return _breakdown("category", date_from, date_to, database)


@router.get("/merchants")
def merchants(
    date_from: datetime,
    date_to: datetime,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    return _breakdown("merchant", date_from, date_to, database)


@router.get("/payment-methods")
def payment_methods(
    date_from: datetime,
    date_to: datetime,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    return _breakdown("payment_method", date_from, date_to, database)
