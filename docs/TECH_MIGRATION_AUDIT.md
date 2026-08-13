# TapLedger Cloudflare 技术迁移审计

审计日期：2026-08-13（Asia/Shanghai）

## 项目范围与工具

| 项目 | 实际结果 |
| --- | --- |
| 当前工作目录 | `D:\自动记账项目` |
| PROJECT_ROOT | `D:\自动记账项目`（`git rev-parse --show-toplevel` 返回 `D:/自动记账项目`） |
| Git 仓库 | 已在项目根初始化；当前分支 `migration/cloudflare-d1` |
| 迁移前快照 | `c3dfb5d checkpoint: before Cloudflare technical migration` |
| Git remote | 无 |
| Node.js | `v24.13.1` |
| npm | `11.8.0` |
| Git | `2.53.0.windows.1` |
| package manager | npm；现有锁文件为 `frontend/package-lock.json` |
| 前端框架 | React `19.2.8` + TypeScript `7.0.2` |
| 构建/测试 | Vite `8.2.1`、Vitest `4.1.10`、Playwright `1.62.1` |
| 路由/数据/图表/图标 | React Router、TanStack Query、Recharts、Lucide React |
| Cloudflare 依赖 | 审计时尚未安装；将在 Phase 2 作为项目内依赖加入 |

`.gitignore` 已在快照前确认排除 `.env`、`.dev.vars`、`wrangler.instance.jsonc`、数据库、运行数据、备份、日志、测试报告和构建产物。快照中未包含数据库、Secret 或运行数据。

## UI 冻结基准

- 旧实现使用项目内隔离数据目录 `runtime/e2e/`，仅在 `127.0.0.1:8788` 启动；没有读取或修改系统正式数据目录。
- 基准命令：`TAPLEDGER_E2E_URL=http://127.0.0.1:8788 TAPLEDGER_VISUAL_DIR=visual-baseline npx playwright test tests/e2e/visual-freeze.spec.ts --project=desktop`（环境变量由 PowerShell 分别设置）。
- 实际结果：`2 passed (17.3s)`。
- 共生成 13 张截图，覆盖登录、首页、交易、编辑器、分析、设置、复核，桌面/手机、浅色/深色；文件位于 `tests/visual-baseline/`。
- 页面、组件树、字体、图标、断点和截图清单见 `docs/UI_FREEZE.md`。

## 当前实现分类

### A. 必须保留的 UI

- `frontend/src/routes/`、`frontend/src/components/`、`frontend/src/styles.css`、providers 和 PWA 入口。
- `frontend/public/` 的 manifest、service worker 与图标资产。
- `docs/design/`、现有产品截图和 `tests/visual-baseline/`。
- React Router、TanStack Query、Recharts、Lucide React、当前 CSS tokens、断点、桌面侧栏和手机底部导航。

### B. 可继续使用的通用前端逻辑

- `frontend/src/lib/api.ts` 已使用相对 `/api/v1/...` 路径，可保留公开 contract，仅替换后端实现。
- `frontend/src/lib/format.ts`、`pendingQueue.ts`、localization、主题、PWA 和表单状态。
- UI 组件继续接收现有 props 和数据 shape，不将 Worker/D1 转换逻辑放进页面组件。

### C. 需要迁移的数据模型

- `ledger_transactions`、`categories`、`payment_methods`、`merchant_rules`、`app_settings`、`users`、`user_sessions`、`shortcut_tokens`/旧设置 token hash、`import_events`。
- 金额字段继续使用 `amount_minor` 整数与 `currency_code`；`client_event_id` 保持唯一。
- 旧 SQLAlchemy/Alembic 只作为 schema 和约束证据，目标使用版本化 D1 SQL migration。

### D. 需要迁移的 API contract

- setup/auth/session/CSRF、transactions、categories、payment methods、merchant rules、review inbox、analytics、automation/shortcut、CSV/JSON export、JSON backup/restore、health/status。
- 前端调用边界由 `frontend/src/lib/api.ts` 与 `frontend/src/types/api.ts` 决定；旧 `backend/app/schemas/`、presenters 和 tests 用于字段、状态码、金额/日期/空值语义核对。
- Shortcut 新实现兼容 `Authorization: Bearer <token>`，可临时兼容旧 `X-TapLedger-Token` 以保证已有调用不瞬间失效；D1 只保存 token hash。

### E. 明确属于旧技术路线

- `backend/` 中的 Python、FastAPI、Uvicorn、Pydantic、SQLAlchemy、Alembic 与 SQLite 文件备份实现。
- `scripts/` 中 16 个 Windows 本机服务、Task Scheduler、SQLite 文件备份、电源和 Tailscale PowerShell 脚本。
- `docs/TAILSCALE_SETUP.md`；其他旧用户文档需原位改写。
- `frontend/vite.config.ts` 中指向 `http://127.0.0.1:8787` 的开发代理、`frontend/playwright.config.ts` 的旧默认地址，以及 UI 中旧本机/Tailscale 技术文案。

这些文件当前仍是可回退基准，必须在 Worker/D1 的本地 migration、测试、构建和视觉回归通过后，才按 `docs/TECH_MIGRATION_REMOVALS.md` 逐项处理。

### F. 需继续核对的混合内容

- `README.md`、`PROGRESS.md`、`design-qa.md` 中同时包含历史证据与当前安装说明；历史证据可保留，但不得继续把旧栈写成现行部署方式。
- 旧后端 tests 需要翻译为 Worker unit/contract/integration tests后才可随旧后端删除。
- 旧设置页的诊断容器应保留视觉结构，仅把本机数据库/Tailscale 含义改为 Cloudflare Worker/D1 诊断。

### G. 数据保护与只读核查

项目内仅发现 E2E 数据库及其测试备份，没有发现其他 SQLite 文件。2026-08-13 使用 SQLite 只读连接执行 `PRAGMA quick_check` 和表记录计数，没有读取或输出交易字段内容：

| 文件 | quick_check | transactions | import_events | users | 说明 |
| --- | --- | ---: | ---: | ---: | --- |
| `runtime/e2e/data/tapledger.sqlite3` | `ok` | 9 | 17 | 1 | 当前 UI 基准测试库 |
| `runtime/e2e-backups/tapledger-2026-08-12-193454.sqlite3` | `ok` | 2 | 4 | E2E 备份 |
| `runtime/e2e-backups/tapledger-2026-08-12-193454-1.sqlite3` | `ok` | 2 | 4 | E2E 备份 |
| `runtime/e2e-backups/tapledger-2026-08-12-195436.sqlite3` | `ok` | 5 | 10 | E2E 备份 |

所有这些文件均被 Git 忽略。它们在一次性迁移脚本和 D1 记录数核对完成前仍按受保护数据处理，不自动删除或移动。

## 官方 Cloudflare 配置依据

- Cloudflare Vite Plugin 读取 `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH`，并在构建时生成用于部署的输出 Wrangler 配置。
- SPA 使用 `assets.not_found_handling = "single-page-application"`；Vite Plugin 会自动写入构建资产目录。
- D1 migration 使用 binding `DB`，本地与远程明确区分 `--local` / `--remote`。
- Deploy to Cloudflare 支持从公开 Wrangler 配置自动供应 D1，公开部署脚本应先对 binding `DB` 应用 migration 再部署。
- Workers 原生 Web Crypto 支持 `crypto.subtle`、SHA-256 和 PBKDF2；认证实现不依赖 Node.js crypto 或 Python Argon2。

## Phase 1 结论

- 项目范围、快照、分支、UI baseline、旧 API/schema/业务规则和数据文件已完成审计。
- 未修改项目目录外文件，未删除旧实现或任何数据，未触碰正式 8787 服务和系统用户数据目录。
- 下一步是 Phase 2：加入 Cloudflare Vite Plugin、Worker 入口、D1 binding、migration 与 Workers 测试配置。
