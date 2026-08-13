# TapLedger Cloudflare 技术迁移审计

审计日期：2026-08-13（Asia/Shanghai）

## 项目范围与工具

| 项目 | 实际结果 |
| --- | --- |
| 当前工作目录 | `D:\自动记账项目` |
| PROJECT_ROOT | `D:\自动记账项目`（`git rev-parse --show-toplevel` 已确认失败，使用当前工作目录） |
| Git 仓库 | 否；当前无分支、remote 或可用 Git status |
| Node.js | `v24.13.1` |
| npm | `11.8.0` |
| package manager | npm；`frontend/package-lock.json` 存在 |
| 前端框架 | React `19.2.8` + TypeScript `7.0.2` |
| 构建/测试 | Vite `8.2.1`、Vitest `4.1.10`、Playwright `1.62.1` |
| 路由/数据/图表/图标 | React Router、TanStack Query、Recharts、Lucide React |
| Cloudflare 依赖 | 本轮仅整理规范，尚未安装或声称可用 |

## 当前实现分类

### A. 必须保留的 UI

- `frontend/src/` 中的 routes、components、styles、providers、hooks 与类型。
- `frontend/public/` 的 PWA 资产。
- `frontend/tests/`、Playwright 配置与设计/视觉证据。
- `docs/design/` 和项目现有产品截图。

迁移前仍需按 `UI_FREEZE.md` 生成完整 `tests/visual-baseline/`；本轮没有修改前端文件。

### B. 可复用的通用前端逻辑

- React Router、TanStack Query、金额/日期格式化、localization、PWA、离线队列和现有表单状态。
- 数据层实际迁移前需进一步确认 `frontend/src` 中 API client、query/mutation hooks 与 auth wiring 的引用边界。

### C/D. 需要迁移的数据模型与 API contract

- `backend/app/models/`、`backend/app/schemas/`、`backend/app/services/`、`backend/app/api/`。
- `backend/alembic/` 与后端 tests 包含旧 schema、业务规则和 contract 证据。
- `frontend/src/types/api.ts` 与 UI 实际调用共同决定兼容边界。

### E. 明确属于旧技术路线

- `backend/` 的 Python/FastAPI/Uvicorn/SQLAlchemy/Alembic 实现。
- `scripts/` 中现有 PowerShell 本机服务、Task Scheduler、SQLite 文件备份和 Tailscale 脚本。
- `docs/TAILSCALE_SETUP.md`；其他旧用户文档需要原位改写。

这些实现层文件尚未删除；必须等 Worker/D1 本地替代实现与测试通过。精确候选见 `TECH_MIGRATION_REMOVALS.md`。

### F. 需要在实现迁移中继续核对

- `README.md`、`PROGRESS.md`、`design-qa.md` 中混合的历史证据与当前运行说明。
- `frontend/vite.config.ts` 中旧开发代理/静态构建行为。
- 旧后端 tests 中哪些应翻译为 Worker contract/integration tests。

### G. 数据保护项

已发现 `runtime/e2e/` 与 `runtime/e2e-backups/` 内的 SQLite/SHM/WAL/备份文件。未读取交易内容，未删除、移动或提交；在完成真实/测试数据判定和迁移核对前统一按受保护数据处理。

## 本轮结果

- 根 `AGENTS.md` 与 `docs/guides/` 已切换为 Cloudflare 迁移规范。
- 删除三份已被新专题指南完整替代的旧指南；未删除旧实现或数据。
- 尚未初始化 Git、创建 checkpoint/分支、安装依赖、修改前端、构建 Worker、运行 D1 migration、测试或部署；这些必须按 `DELIVERY_PLAN.md` 后续执行，不能视为已完成。
