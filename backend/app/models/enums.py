"""Stable persisted enum values."""

from enum import StrEnum
from typing import TypeVar


EnumT = TypeVar("EnumT", bound=StrEnum)


def enum_values(enum_class: type[EnumT]) -> list[str]:
    """Persist public enum values instead of Python member names."""

    return [member.value for member in enum_class]


class TransactionType(StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    REFUND = "refund"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class TransactionSource(StrEnum):
    WALLET_SHORTCUT = "wallet_shortcut"
    MANUAL_PWA = "manual_pwa"
    CSV_IMPORT = "csv_import"
    RECURRING = "recurring"
    SIMULATOR = "simulator"


class ReviewStatus(StrEnum):
    CONFIRMED = "confirmed"
    NEEDS_REVIEW = "needs_review"
    MISSING_INFORMATION = "missing_information"
    DUPLICATE_CANDIDATE = "duplicate_candidate"


class PaymentMethodType(StrEnum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    TRANSIT_CARD = "transit_card"
    CASH = "cash"
    DIGITAL_WALLET = "digital_wallet"
    BANK_TRANSFER = "bank_transfer"
    OTHER = "other"


class MerchantMatchType(StrEnum):
    EXACT = "exact"
    CONTAINS = "contains"
    REGEX = "regex"
