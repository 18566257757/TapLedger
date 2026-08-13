from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, new_uuid, utc_now


class ImportEvent(Base):
    __tablename__ = "import_events"
    __table_args__ = (Index("ix_import_events_received", "received_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    client_event_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    result: Mapped[str] = mapped_column(String(60), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(String(240))
    transaction_id: Mapped[str | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="SET NULL")
    )
    merchant_summary: Mapped[str | None] = mapped_column(String(120))
    amount_summary: Mapped[str | None] = mapped_column(String(40))
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    request_identity: Mapped[str | None] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    transaction = relationship("LedgerTransaction")
