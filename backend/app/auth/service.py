"""Local administrator and session lifecycle."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password, hash_token, new_secret, verify_password
from app.database.base import utc_now
from app.models import User, UserSession


class AuthenticationError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class SessionCredentials:
    token: str
    csrf_token: str
    record: UserSession


def create_admin(database: Session, username: str, password: str) -> User:
    if database.scalar(select(User.id).limit(1)) is not None:
        raise AuthenticationError("Administrator already exists")
    user = User(username=username, password_hash=hash_password(password))
    database.add(user)
    database.flush()
    return user


def authenticate(database: Session, username: str, password: str) -> User:
    user = database.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(user.password_hash, password):
        raise AuthenticationError("Invalid username or password")
    return user


def create_session(
    database: Session, user: User, ttl_hours: int
) -> SessionCredentials:
    token = new_secret(48)
    csrf_token = new_secret(32)
    now = utc_now()
    record = UserSession(
        user_id=user.id,
        token_hash=hash_token(token),
        csrf_token_hash=hash_token(csrf_token),
        created_at=now,
        expires_at=now + timedelta(hours=ttl_hours),
    )
    database.add(record)
    database.flush()
    return SessionCredentials(token, csrf_token, record)


def get_active_session(database: Session, token: str) -> UserSession | None:
    record = database.scalar(
        select(UserSession).where(UserSession.token_hash == hash_token(token))
    )
    if record is None or record.revoked_at is not None:
        return None
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        return None
    return record


def revoke_session(database: Session, record: UserSession) -> None:
    record.revoked_at = utc_now()
    database.flush()


def rotate_csrf_token(database: Session, record: UserSession) -> str:
    """Issue a fresh same-origin CSRF secret for an existing session."""
    csrf_token = new_secret(32)
    record.csrf_token_hash = hash_token(csrf_token)
    database.flush()
    return csrf_token


def change_password(user: User, current_password: str, new_password: str) -> None:
    if not verify_password(user.password_hash, current_password):
        raise AuthenticationError("Current password is incorrect")
    user.password_hash = hash_password(new_password)
