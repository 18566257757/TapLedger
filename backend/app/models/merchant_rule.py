from __future__ import annotations

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, new_uuid
from app.models.enums import MerchantMatchType, enum_values


class MerchantRule(TimestampMixin, Base):
    __tablename__ = "merchant_rules"
    __table_args__ = (
        Index("ix_merchant_rules_enabled_priority", "is_enabled", "priority"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    pattern: Mapped[str] = mapped_column(String(240), nullable=False)
    normalized_pattern: Mapped[str] = mapped_column(String(240), nullable=False)
    match_type: Mapped[MerchantMatchType] = mapped_column(
        Enum(
            MerchantMatchType,
            native_enum=False,
            values_callable=enum_values,
            validate_strings=True,
        ),
        nullable=False,
    )
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL")
    )
    payment_method_id: Mapped[str | None] = mapped_column(
        ForeignKey("payment_methods.id", ondelete="SET NULL")
    )
    default_purpose: Mapped[str | None] = mapped_column(String(240))
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category = relationship("Category")
    payment_method = relationship("PaymentMethod")
