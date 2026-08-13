from decimal import Decimal

import pytest

from app.services.money import MoneyError, from_minor_units, to_minor_units


@pytest.mark.parametrize(
    ("amount", "currency", "expected"),
    [
        ("42.80", "HKD", 4280),
        ("100", "JPY", 100),
        ("1.005", "USD", 101),
        (Decimal("19.995"), "EUR", 2000),
        (12, "GBP", 1200),
    ],
)
def test_to_minor_units(amount, currency, expected):
    assert to_minor_units(amount, currency) == expected


def test_currency_code_is_normalized():
    assert to_minor_units("42.80", " hkd ") == 4280


@pytest.mark.parametrize("amount", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_amounts_are_rejected(amount):
    with pytest.raises(MoneyError, match="finite"):
        to_minor_units(amount, "HKD")


def test_negative_amount_is_rejected_by_default():
    with pytest.raises(MoneyError, match="negative"):
        to_minor_units("-1.00", "HKD")


def test_negative_amount_can_be_explicitly_allowed():
    assert to_minor_units("-1.00", "HKD", allow_negative=True) == -100


def test_float_input_is_rejected():
    with pytest.raises(MoneyError, match="strings"):
        to_minor_units(42.8, "HKD")


def test_unsupported_currency_is_rejected():
    with pytest.raises(MoneyError, match="Unsupported currency"):
        to_minor_units("1.00", "AUD")


def test_from_minor_units_preserves_exponent():
    assert from_minor_units(4280, "HKD") == Decimal("42.80")
    assert from_minor_units(100, "JPY") == Decimal("100")
