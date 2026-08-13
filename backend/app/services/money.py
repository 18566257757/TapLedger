"""Exact currency conversion using integer minor units."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


class MoneyError(ValueError):
    """Raised when an amount cannot be safely normalized."""


@dataclass(frozen=True, slots=True)
class CurrencySpec:
    code: str
    exponent: int

    @property
    def factor(self) -> Decimal:
        return Decimal(10) ** self.exponent

    @property
    def quantum(self) -> Decimal:
        return Decimal(1).scaleb(-self.exponent)


SUPPORTED_CURRENCIES: dict[str, CurrencySpec] = {
    code: CurrencySpec(code, exponent)
    for code, exponent in {
        "HKD": 2,
        "CNY": 2,
        "USD": 2,
        "CAD": 2,
        "JPY": 0,
        "EUR": 2,
        "GBP": 2,
    }.items()
}


def get_currency_spec(currency_code: str) -> CurrencySpec:
    normalized = currency_code.strip().upper()
    try:
        return SUPPORTED_CURRENCIES[normalized]
    except KeyError as exc:
        raise MoneyError(f"Unsupported currency: {normalized or '<empty>'}") from exc


def parse_decimal_amount(value: str | int | Decimal) -> Decimal:
    if isinstance(value, bool) or isinstance(value, float):
        raise MoneyError("Amounts must be strings, integers, or Decimal values")
    try:
        amount = Decimal(value)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise MoneyError("Amount is not a valid decimal number") from exc
    if not amount.is_finite():
        raise MoneyError("Amount must be finite")
    return amount


def to_minor_units(
    value: str | int | Decimal,
    currency_code: str,
    *,
    allow_negative: bool = False,
) -> int:
    amount = parse_decimal_amount(value)
    if not allow_negative and amount < 0:
        raise MoneyError("Amount cannot be negative")
    spec = get_currency_spec(currency_code)
    quantized = amount.quantize(spec.quantum, rounding=ROUND_HALF_UP)
    return int(quantized * spec.factor)


def from_minor_units(amount_minor: int, currency_code: str) -> Decimal:
    if isinstance(amount_minor, bool) or not isinstance(amount_minor, int):
        raise MoneyError("Minor amount must be an integer")
    spec = get_currency_spec(currency_code)
    return (Decimal(amount_minor) / spec.factor).quantize(spec.quantum)
