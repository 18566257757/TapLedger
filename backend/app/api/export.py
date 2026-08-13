from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthenticatedSession, get_authenticated_session
from app.database.session import get_db
from app.services.export import export_csv, export_json


router = APIRouter(prefix="/api/v1/export", tags=["export"])


@router.get("/csv")
def csv_download(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
) -> Response:
    return Response(
        export_csv(database),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="tapledger-transactions.csv"'},
    )


@router.get("/json")
def json_download(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
) -> Response:
    return Response(
        export_json(database),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="tapledger-transactions.json"'},
    )
