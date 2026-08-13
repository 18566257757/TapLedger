"""Typed application settings."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.paths import RuntimePaths, resolve_runtime_paths


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        env_prefix="TAPLEDGER_",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = Field(default=8787, ge=1, le=65535)
    data_dir: Path | None = None
    backup_dir: Path | None = None
    session_secret: str | None = None
    shortcut_token: str | None = None
    tailscale_base_url: str | None = None
    log_level: str = "INFO"
    session_ttl_hours: int = Field(default=12, ge=1, le=168)
    max_request_bytes: int = Field(default=64 * 1024, ge=1024, le=1024 * 1024)

    @field_validator("host")
    @classmethod
    def host_must_be_loopback(cls, value: str) -> str:
        if value not in {"127.0.0.1", "localhost"}:
            raise ValueError("TapLedger host must remain loopback-only")
        return value

    @field_validator("log_level")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
            raise ValueError("Unsupported log level")
        return normalized

    @property
    def paths(self) -> RuntimePaths:
        return resolve_runtime_paths(self.data_dir, self.backup_dir)

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.paths.database.as_posix()}"

    @property
    def secure_cookies(self) -> bool:
        return self.environment.lower() not in {"development", "test"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
