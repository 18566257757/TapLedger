"""Resolve TapLedger runtime paths without creating them at import time."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class RuntimePaths:
    root: Path
    data: Path
    logs: Path
    runtime: Path
    config: Path
    backups: Path

    @property
    def database(self) -> Path:
        return self.data / "tapledger.sqlite3"

    @property
    def pid_file(self) -> Path:
        return self.runtime / "tapledger.pid"


def _default_root() -> Path:
    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "TapLedger"
    return Path.home() / ".local" / "share" / "TapLedger"


def _default_backup_dir() -> Path:
    user_profile = os.getenv("USERPROFILE")
    if user_profile:
        return Path(user_profile) / "Documents" / "TapLedger Backups"
    return Path.home() / "Documents" / "TapLedger Backups"


def resolve_runtime_paths(
    data_dir: Path | None = None,
    backup_dir: Path | None = None,
) -> RuntimePaths:
    """Resolve environment-aware paths.

    ``TAPLEDGER_DATA_DIR`` represents the application root so it can contain
    the required data/logs/runtime/config subdirectories.
    """

    root = Path(
        data_dir
        or os.getenv("TAPLEDGER_DATA_DIR")
        or _default_root()
    ).expanduser()
    backups = Path(
        backup_dir
        or os.getenv("TAPLEDGER_BACKUP_DIR")
        or _default_backup_dir()
    ).expanduser()
    return RuntimePaths(
        root=root,
        data=root / "data",
        logs=root / "logs",
        runtime=root / "runtime",
        config=root / "config",
        backups=backups,
    )


def ensure_runtime_directories(paths: RuntimePaths) -> None:
    """Create runtime directories without touching an existing database."""

    for directory in (
        paths.root,
        paths.data,
        paths.logs,
        paths.runtime,
        paths.config,
        paths.backups,
    ):
        directory.mkdir(parents=True, exist_ok=True)
