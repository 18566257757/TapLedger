# 备份与恢复

## 创建备份

运行 `.\scripts\backup.ps1`，或在 Settings → Data & backups 点击“Back up now”。TapLedger 使用 SQLite connection backup API，不会在数据库可能写入时直接复制主文件。每个备份在前后执行完整性检查，并生成同名 `.sha256` 文件。

默认保留最近 30 个每日备份，并额外保留最多 12 个月度备份。目录是 `%USERPROFILE%\Documents\TapLedger Backups\`。

## 恢复

1. 运行 `.\scripts\status.ps1` 并记下当前状态。
2. 在备份目录中选择完整文件名，不要移动到其他目录。
3. 运行：

```powershell
.\scripts\restore.ps1 -BackupName 'tapledger-2026-08-12-020000.sqlite3' -ConfirmRestore
```

脚本会验证选中备份、停止受 PID 文件管理的 TapLedger、先备份当前数据库、原子替换、运行 Alembic、再次检查并在原先运行时重新启动。迁移或启动失败时会尝试用恢复前备份回滚。

恢复是高影响操作。网页端只提供密码保护的“验证备份”能力，不直接覆盖数据库；实际恢复必须从 PowerShell明确传入 `-ConfirmRestore`。
