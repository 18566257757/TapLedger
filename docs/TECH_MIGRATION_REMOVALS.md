# TapLedger 技术迁移删除清单

PROJECT_ROOT：`D:\自动记账项目`

本文件必须在任何旧路线删除前存在。所有路径均以该 PROJECT_ROOT 为边界；不得据此删除项目外同名文件。

## 本次指南整理中立即替换并删除

以下旧指南已由新专题指南完整替代，并已于 2026-08-13 逐个删除：

| 绝对路径 | 状态 | 原因 | 替代指南 |
| --- | --- | --- | --- |
| `D:\自动记账项目\docs\guides\WINDOWS_OPERATIONS.md` | 已删除 | 只描述本机 FastAPI、Task Scheduler 与 Tailscale | `CLOUDFLARE_DEPLOYMENT.md` |
| `D:\自动记账项目\docs\guides\DATA_OPERATIONS.md` | 已删除 | 只描述本机 SQLite 文件备份/恢复和本机诊断 | `D1_DATA_MIGRATION.md`、`SECURITY_AND_PRIVACY.md` |
| `D:\自动记账项目\docs\guides\PWA_PRODUCT.md` | 已删除 | 包含迁移期间禁止继续演进的旧设计说明 | `UI_FREEZE.md`；业务行为由其他专题指南保留 |

## Cloudflare 替代实现验证后才可删除

以下是实现层候选项，**本轮指南整理不删除**。只有 Phase 5 本地验证通过并再次审计引用后，才可由安全删除脚本逐项删除：

### Python/FastAPI 后端

- `D:\自动记账项目\backend`

删除前必须先迁移其中的数据模型、API contract、业务服务与测试语义；不得把仍需移植的 schema/fixtures 当成无用文件。

### Windows、本机服务、SQLite 文件备份与 Tailscale 脚本

- `D:\自动记账项目\scripts\backup.ps1`
- `D:\自动记账项目\scripts\common.ps1`
- `D:\自动记账项目\scripts\configure-power.ps1`
- `D:\自动记账项目\scripts\configure-tailscale.ps1`
- `D:\自动记账项目\scripts\health-check.ps1`
- `D:\自动记账项目\scripts\install-backup-task.ps1`
- `D:\自动记账项目\scripts\install-startup-task.ps1`
- `D:\自动记账项目\scripts\restart.ps1`
- `D:\自动记账项目\scripts\restore.ps1`
- `D:\自动记账项目\scripts\setup.ps1`
- `D:\自动记账项目\scripts\start.ps1`
- `D:\自动记账项目\scripts\status.ps1`
- `D:\自动记账项目\scripts\stop.ps1`
- `D:\自动记账项目\scripts\uninstall-backup-task.ps1`
- `D:\自动记账项目\scripts\uninstall-startup-task.ps1`
- `D:\自动记账项目\scripts\update.ps1`

### 仅属于旧部署路线的用户文档

- `D:\自动记账项目\docs\TAILSCALE_SETUP.md`

下列文档应按新路线**原位改写而不是直接删除**：

- `D:\自动记账项目\README.md`
- `D:\自动记账项目\docs\INSTALL.md`
- `D:\自动记账项目\docs\BACKUP_AND_RESTORE.md`
- `D:\自动记账项目\docs\TROUBLESHOOTING.md`
- `D:\自动记账项目\docs\IPHONE_PWA_SETUP.md`
- `D:\自动记账项目\docs\SHORTCUT_SIMPLE_SETUP.md`
- `D:\自动记账项目\docs\SHORTCUT_RELIABLE_SETUP.md`
- `D:\自动记账项目\docs\WALLET_AUTOMATION_SETUP.md`

## 永不自动删除的数据保护项

下列已发现项目内数据库目前视为测试/迁移证据，但在完成内容判定和迁移核对前一律按 G 类数据保护：

- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3`
- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3-shm`
- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3-wal`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-193454.sqlite3`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-193454-1.sqlite3`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-195436.sqlite3`

`.env`、未来的 `.dev.vars`、`wrangler.instance.jsonc`、迁移备份、日志和任何未知数据库都不得通过旧栈清理脚本删除或提交。

## 执行记录

- 2026-08-13：建立新指南结构；三份被替代的旧指南已按绝对路径逐个删除。实现层候选项仍保留，等待 Cloudflare 本地替代实现和测试通过。
