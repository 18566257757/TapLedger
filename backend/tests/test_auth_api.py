from fastapi import Request
from fastapi.testclient import TestClient

from app.api.auth import _request_uses_https


def test_initial_setup_login_logout_and_csrf(client: TestClient):
    assert client.get("/api/v1/setup/status").json() == {"setup_required": True}
    setup = client.post(
        "/api/v1/setup/admin",
        json={
            "username": "mayn",
            "password": "this is a long local password",
            "base_currency": "HKD",
            "timezone": "Asia/Hong_Kong",
        },
    )
    assert setup.status_code == 201
    csrf = setup.json()["csrf_token"]
    assert client.get("/api/v1/setup/status").json() == {"setup_required": False}
    assert client.get("/api/v1/auth/me").json()["username"] == "mayn"

    no_csrf = client.post("/api/v1/auth/logout")
    assert no_csrf.status_code == 403
    logout = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401

    bad_login = client.post(
        "/api/v1/auth/login", json={"username": "mayn", "password": "wrong"}
    )
    assert bad_login.status_code == 401
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "mayn", "password": "this is a long local password"},
    )
    assert login.status_code == 200
    previous_csrf = login.json()["csrf_token"]
    refreshed = client.post("/api/v1/auth/csrf")
    assert refreshed.status_code == 200
    assert refreshed.json()["user"]["username"] == "mayn"
    assert refreshed.json()["csrf_token"] != previous_csrf
    assert client.post(
        "/api/v1/auth/logout", headers={"X-CSRF-Token": previous_csrf}
    ).status_code == 403


def test_second_admin_is_rejected(authenticated_client):
    client, _csrf = authenticated_client
    response = client.post(
        "/api/v1/setup/admin",
        json={"username": "another", "password": "another long password"},
    )
    assert response.status_code == 409


def test_security_headers_are_present(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def _request(scheme: str = "http", client_host: str = "127.0.0.1", forwarded_proto: str | None = None) -> Request:
    headers = []
    if forwarded_proto:
        headers.append((b"x-forwarded-proto", forwarded_proto.encode("ascii")))
    return Request(
        {
            "type": "http",
            "method": "POST",
            "scheme": scheme,
            "path": "/api/v1/auth/login",
            "query_string": b"",
            "headers": headers,
            "server": ("127.0.0.1", 8787),
            "client": (client_host, 50000),
        }
    )


def test_session_cookie_transport_detects_local_http_and_private_https_proxy():
    assert _request_uses_https(_request()) is False
    assert _request_uses_https(_request(scheme="https")) is True
    assert _request_uses_https(_request(forwarded_proto="https")) is True
    assert _request_uses_https(_request(client_host="192.0.2.10", forwarded_proto="https")) is False
