from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import MerchantMatchType, PaymentMethodType


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(default="circle", max_length=80)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int | None = None
    is_archived: bool | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    icon: str
    sort_order: int
    is_system: bool
    is_archived: bool


class PaymentMethodCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    issuer: str | None = Field(default=None, max_length=120)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    method_type: PaymentMethodType = PaymentMethodType.CREDIT_CARD
    shortcut_match_text: str | None = Field(default=None, max_length=180)
    icon: str = Field(default="credit-card", max_length=80)


class PaymentMethodUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    issuer: str | None = Field(default=None, max_length=120)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    method_type: PaymentMethodType | None = None
    shortcut_match_text: str | None = Field(default=None, max_length=180)
    icon: str | None = Field(default=None, max_length=80)
    is_archived: bool | None = None


class PaymentMethodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    issuer: str | None
    last_four: str | None
    method_type: PaymentMethodType
    shortcut_match_text: str | None
    icon: str
    is_archived: bool


class MerchantRuleCreate(BaseModel):
    pattern: str = Field(min_length=1, max_length=240)
    match_type: MerchantMatchType = MerchantMatchType.EXACT
    priority: int = Field(default=100, ge=0, le=10_000)
    category_id: str | None = None
    payment_method_id: str | None = None
    default_purpose: str | None = Field(default=None, max_length=240)
    is_enabled: bool = True

    @field_validator("pattern")
    @classmethod
    def strip_pattern(cls, value: str) -> str:
        return value.strip()


class MerchantRuleUpdate(BaseModel):
    pattern: str | None = Field(default=None, min_length=1, max_length=240)
    match_type: MerchantMatchType | None = None
    priority: int | None = Field(default=None, ge=0, le=10_000)
    category_id: str | None = None
    payment_method_id: str | None = None
    default_purpose: str | None = Field(default=None, max_length=240)
    is_enabled: bool | None = None


class MerchantRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pattern: str
    normalized_pattern: str
    match_type: MerchantMatchType
    priority: int
    category_id: str | None
    payment_method_id: str | None
    default_purpose: str | None
    is_enabled: bool
