"""Deterministic merchant-name normalization."""

from __future__ import annotations

import re
import unicodedata


WHITESPACE_RE = re.compile(r"\s+")
UNSAFE_PUNCTUATION_RE = re.compile(r"[^\w\s]", flags=re.UNICODE)
TRAILING_BRANCH_RE = re.compile(
    r"(?:\s+(?:HK|HONG\s+KONG|CENTRAL|IFC))?"
    r"(?:\s+(?:STORE|SHOP|BRANCH|NO))?\s*#?\d{2,6}$",
    flags=re.IGNORECASE,
)
TRAILING_LOCATION_RE = re.compile(
    r"\s+(?:HK|HONG\s+KONG|CENTRAL|IFC)$", flags=re.IGNORECASE
)
MCDONALDS_RE = re.compile(r"^MC\s*DONALD\s*S(?:\s+.*)?$", flags=re.IGNORECASE)


def normalize_merchant(value: str | None) -> str:
    if not value or not value.strip():
        return "UNKNOWN MERCHANT"

    normalized = unicodedata.normalize("NFKC", value)
    normalized = normalized.translate(str.maketrans({"’": "'", "‘": "'", "`": "'"}))
    normalized = normalized.upper().strip()
    normalized = normalized.replace("'", "")
    normalized = UNSAFE_PUNCTUATION_RE.sub(" ", normalized)
    normalized = WHITESPACE_RE.sub(" ", normalized).strip()
    normalized = TRAILING_BRANCH_RE.sub("", normalized).strip()
    normalized = TRAILING_LOCATION_RE.sub("", normalized).strip()

    if MCDONALDS_RE.fullmatch(normalized):
        return "MCDONALDS"
    return normalized or "UNKNOWN MERCHANT"
