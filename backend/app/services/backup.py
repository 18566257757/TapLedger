"""Verified SQLite backups."""

from __future__ import annotations

import hashlib
import os
import shutil
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.core.config import Settings
from app.core.paths import ensure_runtime_directories


class BackupError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class BackupResult:
    path: Path
    sha256: str
    size_bytes: int


def integrity_check(path: Path) -> None:
    if not path.is_file():
        raise BackupError(f"Database does not exist: {path}")
    with closing(sqlite3.connect(path)) as connection:
        result = connection.execute("PRAGMA integrity_check").fetchone()
    if result is None or result[0] != "ok":
        raise BackupError("SQLite integrity check failed")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def create_backup(settings: Settings) -> BackupResult:
    paths = settings.paths
    ensure_runtime_directories(paths)
    integrity_check(paths.database)
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    target = paths.backups / f"tapledger-{timestamp}.sqlite3"
    counter = 1
    while target.exists():
        target = paths.backups / f"tapledger-{timestamp}-{counter}.sqlite3"
        counter += 1
    with closing(sqlite3.connect(paths.database)) as source, closing(
        sqlite3.connect(target)
    ) as destination:
        source.backup(destination)
        destination.commit()
    integrity_check(target)
    checksum = sha256_file(target)
    target.with_suffix(target.suffix + ".sha256").write_text(
        f"{checksum}  {target.name}\n", encoding="ascii"
    )
    prune_backups(paths.backups)
    return BackupResult(target, checksum, target.stat().st_size)


def prune_backups(backup_dir: Path) -> None:
    backups = sorted(
        backup_dir.glob("tapledger-*.sqlite3"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    daily_to_keep = set(backups[:30])
    monthly_to_keep: dict[str, Path] = {}
    for backup in backups:
        month = backup.name[10:17]
        monthly_to_keep.setdefault(month, backup)
    keep = daily_to_keep | set(list(monthly_to_keep.values())[:12])
    for backup in backups:
        if backup not in keep:
            checksum = backup.with_suffix(backup.suffix + ".sha256")
            backup.unlink(missing_ok=True)
            checksum.unlink(missing_ok=True)


def validate_backup(path: Path, backup_root: Path) -> dict[str, str | int]:
    resolved = path.resolve(strict=True)
    root = backup_root.resolve(strict=True)
    if resolved.parent != root:
        raise BackupError("Backup must be selected from the configured backup directory")
    integrity_check(resolved)
    return {
        "name": resolved.name,
        "size_bytes": resolved.stat().st_size,
        "sha256": sha256_file(resolved),
    }


def restore_backup(settings: Settings, backup_name: str) -> tuple[dict[str, str | int], BackupResult | None]:
    """Atomically restore a validated backup while retaining the current database."""
    paths = settings.paths
    ensure_runtime_directories(paths)
    selected = paths.backups / backup_name
    details = validate_backup(selected, paths.backups)
    rollback = create_backup(settings) if paths.database.exists() else None
    staged = paths.data / ".tapledger-restore-staged.sqlite3"
    try:
        shutil.copy2(selected, staged)
        integrity_check(staged)
        os.replace(staged, paths.database)
        integrity_check(paths.database)
    except Exception:
        staged.unlink(missing_ok=True)
        raise
    return details, rollback
