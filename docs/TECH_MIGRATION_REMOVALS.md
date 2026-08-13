# TapLedger 技术迁移删除清单

PROJECT_ROOT：`D:\自动记账项目`

本清单在删除旧实现前写入。所有路径均已解析为绝对路径；安全脚本必须拒绝项目根目录、项目外路径、`.git`、现有 UI 源码/资源、受保护数据目录和任何符号链接或目录联接点。

## 已被新指南替换的旧指南

下列旧指南已于 2026-08-13 被 `docs/guides/` 内的新 Cloudflare 专题指南逐项替换并删除：

- `D:\自动记账项目\docs\guides\WINDOWS_OPERATIONS.md`
- `D:\自动记账项目\docs\guides\DATA_OPERATIONS.md`
- `D:\自动记账项目\docs\guides\PWA_PRODUCT.md`

## Phase 6 精确删除目标

以下实现已由通过本地测试的 Worker/D1 代码、D1 迁移、同源静态资源和部署脚本替代：

- `D:\自动记账项目\backend`
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
- `D:\自动记账项目\docs\TAILSCALE_SETUP.md`
- `D:\自动记账项目\.env.example`

README、安装、备份、故障排查、PWA、Shortcut 和 Wallet 文档不直接删除；它们按新路线原位改写，避免丢失仍有效的产品操作说明。

## 永不由旧栈删除脚本处理的数据

下列旧 SQLite 文件已判定为 E2E/迁移证据，并已完成只读备份与 D1 记录数核对。即便如此，安全删除脚本仍禁止触碰它们；它们保持 Git 忽略，不会发布：

- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3`
- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3-shm`
- `D:\自动记账项目\runtime\e2e\data\tapledger.sqlite3-wal`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-193454.sqlite3`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-193454-1.sqlite3`
- `D:\自动记账项目\runtime\e2e-backups\tapledger-2026-08-12-195436.sqlite3`
- `D:\自动记账项目\migration-local-data\legacy-backups\tapledger.sqlite3.5d55c5bb957d.readonly.sqlite3`

`.env`、`.dev.vars`、`wrangler.instance.jsonc`、Wrangler 本地状态、日志、未知数据库和真实用户数据同样不在删除范围内。

## 执行记录

- 删除前门禁（2026-08-13）：lint、typecheck、单元测试、Worker 集成测试、前端测试、生产构建、Playwright 核心流程、D1 migration 状态和视觉尺寸比较均通过。
- dry-run：18 个旧栈目标均位于 PROJECT_ROOT 内，目标类型正确且无 ReparsePoint；活跃前端/Worker 不引用这些实现。
- 第一次精确删除：`backend` 被四个旧 Uvicorn 进程锁定，安全脚本按设计立即停止，未继续处理其他目标。
- 用户允许继续后，仅停止命令行明确指向本项目 `backend\.venv`、监听 `127.0.0.1:8787/8788` 的 PID `39112`、`45376`、`2108`、`24876`；18 个目标随后逐项删除成功，复核 dry-run 返回 0。
- `.env.example` 是仅服务旧 Python/Windows 路线的环境模板，删除前在本清单补记；新本地开发模板为 `.dev.vars.example`。
- 删除后残留扫描：活跃代码和现行用户文档不再依赖旧服务；仅迁移审计、迁移安全指南和 publication-check 规则保留历史关键词。
- 删除后复测：lint、typecheck、18 个单元/前端测试、5 个 Worker 集成测试、生产构建和 publication check 均再次通过。
