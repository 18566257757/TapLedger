from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def _create_manual(
    client: TestClient,
    csrf: str,
    *,
    event_id: str,
    transaction_type: str,
    amount: str,
    currency: str,
    merchant: str,
    when: datetime,
    excluded: bool = False,
):
    return client.post(
        "/api/v1/transactions",
        headers={"X-CSRF-Token": csrf},
        json={
            "client_event_id": event_id,
            "type": transaction_type,
            "amount": amount,
            "currency": currency,
            "merchant": merchant,
            "transaction_date": when.isoformat(),
            "is_excluded_from_analytics": excluded,
        },
    )


def test_analytics_separates_currencies_and_subtracts_refunds(authenticated_client):
    client, csrf = authenticated_client
    when = datetime(2026, 8, 12, 6, 0, tzinfo=UTC)
    assert _create_manual(
        client,
        csrf,
        event_id="expense-hkd",
        transaction_type="expense",
        amount="100.00",
        currency="HKD",
        merchant="Shop",
        when=when,
    ).status_code == 201
    _create_manual(
        client,
        csrf,
        event_id="refund-hkd",
        transaction_type="refund",
        amount="20.00",
        currency="HKD",
        merchant="Shop",
        when=when + timedelta(minutes=10),
    )
    _create_manual(
        client,
        csrf,
        event_id="expense-cny",
        transaction_type="expense",
        amount="30.00",
        currency="CNY",
        merchant="Store",
        when=when,
    )
    _create_manual(
        client,
        csrf,
        event_id="income-hkd",
        transaction_type="income",
        amount="500.00",
        currency="HKD",
        merchant="Salary",
        when=when,
    )
    response = client.get(
        "/api/v1/analytics/summary",
        params={
            "date_from": (when - timedelta(days=1)).isoformat(),
            "date_to": (when + timedelta(days=1)).isoformat(),
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["multiple_currencies"] is True
    totals = {item["currency"]: item["net_spending_minor"] for item in body["currencies"]}
    assert totals == {"HKD": 8000, "CNY": 3000}


def test_csv_is_utf8_bom_and_quotes_multiline_text(authenticated_client):
    client, csrf = authenticated_client
    response = _create_manual(
        client,
        csrf,
        event_id="csv-special",
        transaction_type="expense",
        amount="12.30",
        currency="HKD",
        merchant='茶餐廳, "中環"',
        when=datetime.now(UTC),
    )
    assert response.status_code == 201
    transaction_id = response.json()["transaction_id"]
    update = client.patch(
        f"/api/v1/transactions/{transaction_id}",
        headers={"X-CSRF-Token": csrf},
        json={"note": "第一行\n第二行"},
    )
    assert update.status_code == 200
    exported = client.get("/api/v1/export/csv")
    assert exported.status_code == 200
    assert exported.content.startswith(b"\xef\xbb\xbf")
    decoded = exported.content.decode("utf-8-sig")
    assert '"茶餐廳, ""中環"""' in decoded
    assert '"第一行\n第二行"' in decoded.replace("\r\n", "\n")


def test_backup_is_verified_and_listed(authenticated_client):
    client, csrf = authenticated_client
    response = client.post("/api/v1/admin/backup", headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200, response.text
    created = response.json()
    assert len(created["sha256"]) == 64
    listing = client.get("/api/v1/admin/backups")
    assert created["name"] in {item["name"] for item in listing.json()["items"]}


def test_delete_all_data_requires_password_confirmation_and_creates_backup(authenticated_client):
    client, csrf = authenticated_client
    created = _create_manual(
        client,
        csrf,
        event_id="delete-me",
        transaction_type="expense",
        amount="5.00",
        currency="HKD",
        merchant="Temporary",
        when=datetime.now(UTC),
    )
    assert created.status_code == 201
    rejected = client.post(
        "/api/v1/admin/delete-all-data",
        headers={"X-CSRF-Token": csrf},
        json={"password": "correct horse battery staple", "confirmation": "DELETE"},
    )
    assert rejected.status_code == 400
    deleted = client.post(
        "/api/v1/admin/delete-all-data",
        headers={"X-CSRF-Token": csrf},
        json={
            "password": "correct horse battery staple",
            "confirmation": "DELETE ALL DATA",
        },
    )
    assert deleted.status_code == 200
    assert deleted.json()["deleted_transactions"] == 1
    assert client.get("/api/v1/transactions").json()["total"] == 0
    assert deleted.json()["backup_name"] in {
        item["name"] for item in client.get("/api/v1/admin/backups").json()["items"]
    }


def test_status_reports_version_uptime_and_backup(authenticated_client):
    client, _csrf = authenticated_client
    status = client.get("/api/v1/status")
    assert status.status_code == 200
    assert status.json()["version"] == "0.1.0"
    assert status.json()["uptime_seconds"] >= 0
    assert "last_backup" in status.json()
