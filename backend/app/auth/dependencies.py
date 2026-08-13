"""FastAPI dependencies for session, CSRF, and Shortcut authentication."""

from __future__ import annotations

import hmac
from dataclasses import dataclass

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.security import hash_token
from app.auth.service import get_active_session
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models import AppSetting, User, UserSession


SESSION_COOKIE_NAME = "tapledger_session"


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    user: User
    session: UserSession


def get_authenticated_session(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    database: Session = Depends(get_db),
) -> AuthenticatedSession:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    record = get_active_session(database, session_token)
    if record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = database.get(User, record.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return AuthenticatedSession(user=user, session=record)


def require_csrf(
    authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> AuthenticatedSession:
    if not csrf_token or not hmac.compare_digest(
        authenticated.session.csrf_token_hash, hash_token(csrf_token)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    return authenticated


def require_shortcut_token(
    request: Request,
    token: str | None = Header(default=None, alias="X-TapLedger-Token"),
    settings: Settings = Depends(get_settings),
    database: Session = Depends(get_db),
) -> None:
    app_settings = database.get(AppSetting, 1)
    configured_hash = app_settings.shortcut_token_hash if app_settings else None
    if configured_hash:
        valid = bool(token) and hmac.compare_digest(configured_hash, hash_token(token))
    else:
        configured = settings.shortcut_token
        valid = bool(token and configured) and hmac.compare_digest(configured, token)
    if not configured_hash and not settings.shortcut_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Shortcut token is not configured",
        )
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    limiter = request.app.state.shortcut_rate_limiter
    client_key = request.client.host if request.client else "unknown"
    if not limiter.allow(client_key):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
