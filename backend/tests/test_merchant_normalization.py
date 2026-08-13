import pytest

from app.services.merchant_normalization import normalize_merchant


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  STARBUCKS   HK 023  ", "STARBUCKS"),
        ("McDonald's Central", "MCDONALDS"),
        ("MCDONALD’S - IFC", "MCDONALDS"),
        ("香港 茶餐廳", "香港 茶餐廳"),
        ("PARKnSHOP!!!", "PARKNSHOP"),
        (None, "UNKNOWN MERCHANT"),
    ],
)
def test_normalize_merchant(raw, expected):
    assert normalize_merchant(raw) == expected
