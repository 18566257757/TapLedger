"""Merchant matching with deterministic precedence and regex timeouts."""

from __future__ import annotations

import regex
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.models import MerchantRule
from app.models.enums import MerchantMatchType
from app.services.merchant_normalization import normalize_merchant


class RulePatternError(ValueError):
    pass


def validate_regex_pattern(pattern: str) -> None:
    if len(pattern) > 200:
        raise RulePatternError("Regex pattern is too long")
    try:
        regex.compile(pattern)
    except regex.error as exc:
        raise RulePatternError("Invalid regular expression") from exc


def _regex_matches(pattern: str, merchant: str) -> bool:
    validate_regex_pattern(pattern)
    try:
        return regex.search(pattern, merchant, timeout=0.02) is not None
    except TimeoutError as exc:
        raise RulePatternError("Regular expression exceeded time limit") from exc


def find_matching_rule(database: Session, normalized_merchant: str) -> MerchantRule | None:
    rank = case(
        (MerchantRule.match_type == MerchantMatchType.EXACT, 0),
        (MerchantRule.match_type == MerchantMatchType.CONTAINS, 1),
        else_=2,
    )
    rules = database.scalars(
        select(MerchantRule)
        .where(MerchantRule.is_enabled.is_(True))
        .order_by(rank.asc(), MerchantRule.priority.asc(), MerchantRule.created_at.asc())
    ).all()
    for rule in rules:
        pattern = rule.normalized_pattern
        if rule.match_type == MerchantMatchType.EXACT and normalized_merchant == pattern:
            return rule
        if rule.match_type == MerchantMatchType.CONTAINS and pattern in normalized_merchant:
            return rule
        if rule.match_type == MerchantMatchType.REGEX and _regex_matches(
            rule.pattern, normalized_merchant
        ):
            return rule
    return None


def normalized_rule_pattern(pattern: str, match_type: MerchantMatchType) -> str:
    if match_type == MerchantMatchType.REGEX:
        validate_regex_pattern(pattern)
        return pattern
    return normalize_merchant(pattern)
