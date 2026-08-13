"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app import __version__
from app.api import admin, analytics, auth, catalog, export, review, shortcut, transactions
from app.core.config import get_settings
from app.core.middleware import BodySizeLimitMiddleware, SecurityHeadersMiddleware, SlidingWindowRateLimiter
from app.core.paths import ensure_runtime_directories
from app.database.session import SessionLocal
from app.services.bootstrap import bootstrap_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    ensure_runtime_directories(settings.paths)
    with SessionLocal() as database:
        bootstrap_database(database)
    yield


app = FastAPI(
    title="TapLedger API",
    version=__version__,
    docs_url="/api/docs" if get_settings().environment == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.state.shortcut_rate_limiter = SlidingWindowRateLimiter(limit=60, window_seconds=60)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware, max_bytes=get_settings().max_request_bytes)

for router in (
    auth.router,
    shortcut.router,
    transactions.router,
    catalog.router,
    review.router,
    analytics.router,
    export.router,
    admin.router,
):
    app.include_router(router)


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, str]:
    with SessionLocal() as database:
        database.execute(text("SELECT 1"))
    return {"status": "ok", "version": __version__}


static_dir = Path(__file__).resolve().parent / "static"
assets_dir = static_dir / "assets"
if assets_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def serve_pwa(path: str):
    requested = static_dir / path
    if path and requested.is_file() and static_dir in requested.resolve().parents:
        return FileResponse(requested)
    index = static_dir / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="PWA has not been built")
