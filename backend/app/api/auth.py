from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    SESSION_COOKIE_NAME,
    AuthenticatedSession,
    get_authenticated_session,
    require_csrf,
)
from app.auth.service import (
    AuthenticationError,
    authenticate,
    change_password,
    create_admin,
    create_session,
    revoke_session,
    rotate_csrf_token,
)
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models import AppSetting, User
from app.schemas.auth import (
    AdminSetupRequest,
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    SetupStatus,
    UserResponse,
)


router = APIRouter(prefix="/api/v1", tags=["authentication"])


def _request_uses_https(request: Request) -> bool:
    """Honor HTTPS directly or from the trusted loopback reverse proxy only."""

    if request.url.scheme == "https":
        return True
    client_host = request.client.host if request.client else None
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
    return client_host in {"127.0.0.1", "::1"} and forwarded_proto == "https"


def _set_session_cookie(
    response: Response, token: str, settings: Settings, request: Request
) -> None:
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=_request_uses_https(request),
        samesite="strict",
        path="/",
    )


@router.get("/setup/status", response_model=SetupStatus)
def setup_status(database: Session = Depends(get_db)) -> SetupStatus:
    return SetupStatus(setup_required=database.scalar(select(User.id).limit(1)) is None)


@router.post("/setup/admin", response_model=AuthResponse, status_code=201)
def setup_admin(
    payload: AdminSetupRequest,
    request: Request,
    response: Response,
    database: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    try:
        user = create_admin(database, payload.username, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    app_settings = database.get(AppSetting, 1) or AppSetting(id=1)
    database.add(app_settings)
    app_settings.base_currency = payload.base_currency
    app_settings.timezone = payload.timezone
    app_settings.setup_completed = True
    credentials = create_session(database, user, settings.session_ttl_hours)
    database.commit()
    _set_session_cookie(response, credentials.token, settings, request)
    return AuthResponse(user=UserResponse.model_validate(user), csrf_token=credentials.csrf_token)


@router.post("/auth/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    database: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    try:
        user = authenticate(database, payload.username, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    credentials = create_session(database, user, settings.session_ttl_hours)
    database.commit()
    _set_session_cookie(response, credentials.token, settings, request)
    return AuthResponse(user=UserResponse.model_validate(user), csrf_token=credentials.csrf_token)


@router.post(
    "/auth/logout", status_code=204, response_class=Response, response_model=None
)
def logout(
    response: Response,
    authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
) -> Response:
    revoke_session(database, authenticated.session)
    database.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/auth/me", response_model=UserResponse)
def me(
    authenticated: AuthenticatedSession = Depends(get_authenticated_session),
) -> UserResponse:
    return UserResponse.model_validate(authenticated.user)


@router.post("/auth/csrf", response_model=AuthResponse)
def refresh_csrf(
    authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
) -> AuthResponse:
    """Restore SPA state after a reload without exposing the session cookie."""
    csrf_token = rotate_csrf_token(database, authenticated.session)
    database.commit()
    return AuthResponse(
        user=UserResponse.model_validate(authenticated.user),
        csrf_token=csrf_token,
    )


@router.post(
    "/auth/change-password", status_code=204, response_class=Response, response_model=None
)
def update_password(
    payload: ChangePasswordRequest,
    authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
) -> Response:
    try:
        change_password(
            authenticated.user, payload.current_password, payload.new_password
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
