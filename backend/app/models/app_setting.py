from __future__ import annotations

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class AppSetting(TimestampMixin, Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    base_currency: Mapped[str] = mapped_column(String(3), default="HKD", nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(80), default="Asia/Hong_Kong", nullable=False
    )
    language: Mapped[str] = mapped_column(String(20), default="auto", nullable=False)
    week_starts_on: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    default_analytics_period: Mapped[str] = mapped_column(
        String(20), default="month", nullable=False
    )
    location_capture_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    tailscale_base_url: Mapped[str | None] = mapped_column(String(500))
    shortcut_token_hash: Mapped[str | None] = mapped_column(String(64))
    setup_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
