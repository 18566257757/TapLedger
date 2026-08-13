from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ReviewStatus, TransactionSource, TransactionType


class ShortcutTransactionRequest(BaseModel):
    schema_version: int = Field(default=1, ge=1, le=1)
    client_event_id: str = Field(min_length=1, max_length=64)
    amount: str = Field(min_length=1, max_length=40)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    merchant: str | None = Field(default=None, max_length=500)
    card: str | None = Field(default=None, max_length=240)
    transaction_date: datetime | None = None
    captured_at: datetime | None = None
    purpose: str | None = Field(default=None, max_length=240)
    location_name: str | None = Field(default=None, max_length=240)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    source: TransactionSource = TransactionSource.WALLET_SHORTCUT

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else None

    @field_validator("client_event_id")
    @classmethod
    def normalize_event_id(cls, value: str) -> str:
        return value.strip()


class ShortcutBatchRequest(BaseModel):
    transactions: list[ShortcutTransactionRequest] = Field(min_length=1, max_length=100)


class ManualTransactionRequest(BaseModel):
    client_event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), min_length=1, max_length=64
    )
    type: TransactionType = TransactionType.EXPENSE
    amount: str = Field(min_length=1, max_length=40)
    currency: str = Field(min_length=3, max_length=3)
    merchant: str = Field(min_length=1, max_length=500)
    category_id: str | None = None
    payment_method_id: str | None = None
    transaction_date: datetime
    purpose: str | None = Field(default=None, max_length=240)
    note: str | None = Field(default=None, max_length=4000)
    location_name: str | None = Field(default=None, max_length=240)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    is_excluded_from_analytics: bool = False

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: str | None = Field(default=None, min_length=1, max_length=40)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    merchant: str | None = Field(default=None, min_length=1, max_length=500)
    category_id: str | None = None
    payment_method_id: str | None = None
    purpose: str | None = Field(default=None, max_length=240)
    note: str | None = Field(default=None, max_length=4000)
    transaction_date: datetime | None = None
    location_name: str | None = Field(default=None, max_length=240)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    review_status: ReviewStatus | None = None
    is_excluded_from_analytics: bool | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_event_id: str
    type: TransactionType
    amount: str
    amount_minor: int
    currency: str
    transaction_date: datetime
    captured_at: datetime
    merchant_raw: str
    merchant_normalized: str
    card_raw_name: str | None
    category_id: str | None
    category_name: str | None
    payment_method_id: str | None
    payment_method_name: str | None
    purpose: str | None
    note: str | None
    location_name: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    source: TransactionSource
    review_status: ReviewStatus
    is_excluded_from_analytics: bool
    created_at: datetime
    updated_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class IngestionResponse(BaseModel):
    success: bool = True
    result: str
    transaction_id: str
    category: str | None
    review_status: ReviewStatus
    duplicate: bool


class BatchIngestionResponse(BaseModel):
    results: list[IngestionResponse]
    created: int
    duplicates: int
    failed: int
