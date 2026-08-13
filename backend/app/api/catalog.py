from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthenticatedSession, get_authenticated_session, require_csrf
from app.database.session import get_db
from app.models import Category, MerchantRule, PaymentMethod
from app.schemas.catalog import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    MerchantRuleCreate,
    MerchantRuleResponse,
    MerchantRuleUpdate,
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentMethodUpdate,
)
from app.services.rule_engine import normalized_rule_pattern


router = APIRouter(prefix="/api/v1", tags=["catalog"])


def _or_404(database: Session, model, item_id: str):
    item = database.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    include_archived: bool = False,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    query = select(Category).order_by(Category.sort_order, Category.name)
    if not include_archived:
        query = query.where(Category.is_archived.is_(False))
    return database.scalars(query).all()


@router.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(
    payload: CategoryCreate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = Category(**payload.model_dump())
    database.add(item)
    database.commit()
    database.refresh(item)
    return item


@router.patch("/categories/{item_id}", response_model=CategoryResponse)
def update_category(
    item_id: str,
    payload: CategoryUpdate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = _or_404(database, Category, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    database.commit()
    database.refresh(item)
    return item


@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
def list_payment_methods(
    include_archived: bool = False,
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    query = select(PaymentMethod).order_by(PaymentMethod.display_name)
    if not include_archived:
        query = query.where(PaymentMethod.is_archived.is_(False))
    return database.scalars(query).all()


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=201)
def create_payment_method(
    payload: PaymentMethodCreate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = PaymentMethod(**payload.model_dump())
    database.add(item)
    database.commit()
    database.refresh(item)
    return item


@router.patch("/payment-methods/{item_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    item_id: str,
    payload: PaymentMethodUpdate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = _or_404(database, PaymentMethod, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    database.commit()
    database.refresh(item)
    return item


@router.get("/merchant-rules", response_model=list[MerchantRuleResponse])
def list_merchant_rules(
    _authenticated: AuthenticatedSession = Depends(get_authenticated_session),
    database: Session = Depends(get_db),
):
    return database.scalars(
        select(MerchantRule).order_by(MerchantRule.priority, MerchantRule.pattern)
    ).all()


@router.post("/merchant-rules", response_model=MerchantRuleResponse, status_code=201)
def create_merchant_rule(
    payload: MerchantRuleCreate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    values = payload.model_dump()
    values["normalized_pattern"] = normalized_rule_pattern(
        payload.pattern, payload.match_type
    )
    item = MerchantRule(**values)
    database.add(item)
    database.commit()
    database.refresh(item)
    return item


@router.patch("/merchant-rules/{item_id}", response_model=MerchantRuleResponse)
def update_merchant_rule(
    item_id: str,
    payload: MerchantRuleUpdate,
    _authenticated: AuthenticatedSession = Depends(require_csrf),
    database: Session = Depends(get_db),
):
    item = _or_404(database, MerchantRule, item_id)
    changes = payload.model_dump(exclude_unset=True)
    pattern = changes.get("pattern", item.pattern)
    match_type = changes.get("match_type", item.match_type)
    changes["normalized_pattern"] = normalized_rule_pattern(pattern, match_type)
    for field, value in changes.items():
        setattr(item, field, value)
    database.commit()
    database.refresh(item)
    return item
