from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def payload(event_id: str, when: datetime, **overrides):
    value = {
        "schema_version": 1,
        "client_event_id": event_id,
        "amount": "42.80",
        "currency": "HKD",
        "merchant": "STARBUCKS HK 023",
        "card": "HSBC VISA",
        "transaction_date": when.isoformat(),
        "captured_at": when.isoformat(),
        "source": "wallet_shortcut",
    }
    value.update(overrides)
    return value


def test_shortcut_token_is_required(client: TestClient):
    response = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-token", datetime.now(UTC)),
    )
    assert response.status_code == 401


def test_client_event_id_is_idempotent(client: TestClient, shortcut_headers):
    body = payload("evt-idempotent", datetime.now(UTC))
    first = client.post("/api/v1/shortcut/transactions", json=body, headers=shortcut_headers)
    second = client.post("/api/v1/shortcut/transactions", json=body, headers=shortcut_headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["result"] == "already_processed"
    assert second.json()["transaction_id"] == first.json()["transaction_id"]


def test_fingerprint_duplicate_windows(client: TestClient, shortcut_headers):
    start = datetime(2026, 8, 12, 4, 0, tzinfo=UTC)
    first = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-first", start),
        headers=shortcut_headers,
    )
    automatic = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-auto-duplicate", start + timedelta(seconds=20)),
        headers=shortcut_headers,
    )
    candidate = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-candidate", start + timedelta(seconds=90)),
        headers=shortcut_headers,
    )
    later = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-later", start + timedelta(minutes=6)),
        headers=shortcut_headers,
    )
    assert automatic.json()["duplicate"] is True
    assert automatic.json()["transaction_id"] == first.json()["transaction_id"]
    assert candidate.json()["review_status"] == "duplicate_candidate"
    assert candidate.json()["transaction_id"] != first.json()["transaction_id"]
    assert later.json()["transaction_id"] != first.json()["transaction_id"]


def test_unknown_fields_enter_review(client: TestClient, shortcut_headers):
    response = client.post(
        "/api/v1/shortcut/transactions",
        json={
            "client_event_id": "evt-missing",
            "amount": "10.00",
            "captured_at": datetime.now(UTC).isoformat(),
        },
        headers=shortcut_headers,
    )
    assert response.status_code == 200
    assert response.json()["result"] == "created_needs_review"
    assert response.json()["review_status"] == "missing_information"


def test_batch_import_returns_per_item_idempotent_results(client: TestClient, shortcut_headers):
    when = datetime.now(UTC)
    first = payload("evt-batch-1", when)
    second = payload("evt-batch-2", when + timedelta(minutes=6), merchant="MTR")
    response = client.post(
        "/api/v1/shortcut/transactions/batch",
        json={"transactions": [first, second]},
        headers=shortcut_headers,
    )
    assert response.status_code == 200
    assert response.json()["created"] == 2
    repeated = client.post(
        "/api/v1/shortcut/transactions/batch",
        json={"transactions": [first, second]},
        headers=shortcut_headers,
    )
    assert repeated.status_code == 200
    assert [item["result"] for item in repeated.json()["results"]] == [
        "already_processed",
        "already_processed",
    ]


def test_authenticated_simulator_uses_unified_pipeline(authenticated_client):
    client, csrf = authenticated_client
    response = client.post(
        "/api/v1/automation/simulate",
        json={"amount": "12.50", "currency": "HKD", "merchant": "TapLedger Test Merchant"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    transaction_id = response.json()["transaction_id"]
    transaction = client.get(f"/api/v1/transactions/{transaction_id}").json()
    assert transaction["source"] == "simulator"
    assert transaction["merchant_normalized"] == "TAPLEDGER TEST MERCHANT"


def test_rule_and_payment_method_classify_transaction(
    authenticated_client, shortcut_headers
):
    client, csrf = authenticated_client
    headers = {"X-CSRF-Token": csrf}
    categories = client.get("/api/v1/categories").json()
    coffee_id = next(item["id"] for item in categories if item["name"] == "Coffee")
    method = client.post(
        "/api/v1/payment-methods",
        json={
            "display_name": "HSBC Visa",
            "issuer": "HSBC",
            "last_four": "1234",
            "shortcut_match_text": "HSBC VISA",
        },
        headers=headers,
    )
    assert method.status_code == 201
    rule = client.post(
        "/api/v1/merchant-rules",
        json={"pattern": "STARBUCKS", "match_type": "contains", "category_id": coffee_id},
        headers=headers,
    )
    assert rule.status_code == 201
    response = client.post(
        "/api/v1/shortcut/transactions",
        json=payload("evt-classified", datetime.now(UTC)),
        headers=shortcut_headers,
    )
    assert response.json()["category"] == "Coffee"
    assert response.json()["review_status"] == "confirmed"
