from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, new_uuid, utc_now
from app.models.enums import ReviewStatus, TransactionSource, TransactionType, enum_values


class LedgerTransaction(TimestampMixin, Base):
    __tablename__ = "ledger_transactions"
    __table_args__ = (
        Index("ix_transactions_date", "transaction_date"),
        Index("ix_transactions_merchant", "merchant_normalized"),
        Index("ix_transactions_review", "review_status"),
        Index("ix_transactions_dedup", "deduplication_key", "transaction_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    client_event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        Enum(
            TransactionType,
            native_enum=False,
            values_callable=enum_values,
            validate_strings=True,
        ),
        default=TransactionType.EXPENSE,
        nullable=False,
    )
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    merchant_raw: Mapped[str] = mapped_column(String(500), nullable=False)
    merchant_normalized: Mapped[str] = mapped_column(String(240), nullable=False)
    card_raw_name: Mapped[str | None] = mapped_column(String(240))
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL")
    )
    payment_method_id: Mapped[str | None] = mapped_column(
        ForeignKey("payment_methods.id", ondelete="SET NULL")
    )
    purpose: Mapped[str | None] = mapped_column(String(240))
    note: Mapped[str | None] = mapped_column(Text)
    location_name: Mapped[str | None] = mapped_column(String(240))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    location_source: Mapped[str | None] = mapped_column(String(40))
    source: Mapped[TransactionSource] = mapped_column(
        Enum(
            TransactionSource,
            native_enum=False,
            values_callable=enum_values,
            validate_strings=True,
        ),
        nullable=False,
    )
    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(
            ReviewStatus,
            native_enum=False,
            values_callable=enum_values,
            validate_strings=True,
        ),
        nullable=False,
    )
    is_excluded_from_analytics: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    deduplication_key: Mapped[str] = mapped_column(String(64), nullable=False)
    base_amount_minor: Mapped[int | None] = mapped_column(Integer)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 10))
    exchange_rate_source: Mapped[str | None] = mapped_column(String(80))

    category = relationship("Category")
    payment_method = relationship("PaymentMethod")
