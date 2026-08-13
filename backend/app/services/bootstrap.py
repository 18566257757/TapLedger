"""Idempotent creation of required system records."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppSetting, Category


DEFAULT_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("Dining", "utensils"),
    ("Coffee", "coffee"),
    ("Grocery", "shopping-basket"),
    ("Transport", "train-front"),
    ("Shopping", "shopping-bag"),
    ("Entertainment", "ticket"),
    ("Housing", "house"),
    ("Utilities", "lightbulb"),
    ("Subscription", "repeat"),
    ("Travel", "plane"),
    ("Health", "heart-pulse"),
    ("Education", "graduation-cap"),
    ("Work", "briefcase-business"),
    ("Other", "shapes"),
    ("Uncategorized", "circle-help"),
)


def bootstrap_database(database: Session) -> None:
    if database.get(AppSetting, 1) is None:
        database.add(AppSetting(id=1))

    existing_names = set(database.scalars(select(Category.name)).all())
    for sort_order, (name, icon) in enumerate(DEFAULT_CATEGORIES):
        if name not in existing_names:
            database.add(
                Category(
                    name=name,
                    icon=icon,
                    sort_order=sort_order,
                    is_system=True,
                )
            )
    database.commit()
