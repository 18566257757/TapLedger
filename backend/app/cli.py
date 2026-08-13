"""Maintenance commands used by the Windows scripts."""

from __future__ import annotations

import argparse
import json

from app.core.config import get_settings
from app.services.backup import create_backup, restore_backup, validate_backup


def main() -> int:
    parser = argparse.ArgumentParser(prog="tapledger-maintenance")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("backup")
    validate = commands.add_parser("validate-backup")
    validate.add_argument("--name", required=True)
    restore = commands.add_parser("restore")
    restore.add_argument("--name", required=True)
    args = parser.parse_args()
    settings = get_settings()

    if args.command == "backup":
        result = create_backup(settings)
        output = {"name": result.path.name, "size_bytes": result.size_bytes, "sha256": result.sha256}
    elif args.command == "validate-backup":
        output = validate_backup(settings.paths.backups / args.name, settings.paths.backups)
    else:
        details, rollback = restore_backup(settings, args.name)
        output = {**details, "rollback_backup": rollback.path.name if rollback else None}
    print(json.dumps(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
