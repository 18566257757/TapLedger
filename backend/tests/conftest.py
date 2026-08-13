from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient


TEST_RUNTIME = tempfile.TemporaryDirectory(prefix="tapledger-tests-")
os.environ["TAPLEDGER_ENVIRONMENT"] = "test"
os.environ["TAPLEDGER_DATA_DIR"] = TEST_RUNTIME.name
os.environ["TAPLEDGER_BACKUP_DIR"] = os.path.join(TEST_RUNTIME.name, "backups")
os.environ["TAPLEDGER_SHORTCUT_TOKEN"] = "test-shortcut-token-with-at-least-32-bytes"

from app.database.base import Base  # noqa: E402
from app.database.session import engine  # noqa: E402
from app.main import app  # noqa: E402


def pytest_sessionfinish(session, exitstatus) -> None:
    del session, exitstatus
    engine.dispose()
    TEST_RUNTIME.cleanup()


@pytest.fixture()
def client() -> Iterator[TestClient]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def authenticated_client(client: TestClient) -> tuple[TestClient, str]:
    response = client.post(
        "/api/v1/setup/admin",
        json={
            "username": "owner",
            "password": "correct horse battery staple",
            "base_currency": "HKD",
            "timezone": "Asia/Hong_Kong",
        },
    )
    assert response.status_code == 201, response.text
    return client, response.json()["csrf_token"]


@pytest.fixture()
def shortcut_headers() -> dict[str, str]:
    return {"X-TapLedger-Token": os.environ["TAPLEDGER_SHORTCUT_TOKEN"]}
