from __future__ import annotations

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, new_uuid
from app.models.enums import PaymentMethodType, enum_values


class PaymentMethod(TimestampMixin, Base):
    __tablename__ = "payment_methods"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(120))
    last_four: Mapped[str | None] = mapped_column(String(4))
    method_type: Mapped[PaymentMethodType] = mapped_column(
        Enum(
            PaymentMethodType,
            native_enum=False,
            values_callable=enum_values,
            validate_strings=True,
        ),
        default=PaymentMethodType.CREDIT_CARD,
        nullable=False,
    )
    shortcut_match_text: Mapped[str | None] = mapped_column(String(180), unique=True)
    icon: Mapped[str] = mapped_column(String(80), default="credit-card", nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
