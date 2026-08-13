# Cloudflare 技术迁移阶段、完成条件与报告

## 执行原则

严格按阶段连续推进，不等用户逐阶段确认。只有 Cloudflare/GitHub 登录、二次验证、账户/授权选择和 iPhone Personal Automation 可以暂停。每阶段更新 `PROGRESS.md`，目标不能写成完成事实。

## Phase 1：审计与保护

- 确定 PROJECT_ROOT，只在项目内操作。
- 建立安全 `.gitignore`、Git checkpoint 与 `migration/cloudflare-d1`。
- 捕获 UI baseline 并创建 `docs/UI_FREEZE.md`。
- 审计文件、API contract、数据模型、旧技术引用和数据库。
- 完成 `docs/TECH_MIGRATION_AUDIT.md` 与 `docs/TECH_MIGRATION_REMOVALS.md`。

出口：快照不含敏感数据；UI/数据/删除边界有证据。

## Phase 2：Cloudflare 基础

- 安装本地 `@cloudflare/vite-plugin`、Wrangler 及必要兼容依赖并更新 lockfile。
- 添加 Worker 入口、公开 `wrangler.jsonc`、D1 `DB` binding、Static Assets、SPA fallback 和 Worker 类型。
- 创建版本化 D1 migrations。

出口：local D1 migration 与最小 Worker/静态页面可运行，现有 UI 未改造。

## Phase 3：后端迁移

- 依次迁移认证/session、交易、类别、Payment Method、Merchant Rule、Review、analytics、Shortcut、导出/恢复。
- 使用统一导入与业务服务；建立 integration/contract tests。

出口：现有前端实际需要的 `/api/v1/*` 由 Worker + local D1 提供。

## Phase 4：前端接线

- 只改 hooks/services/api/types/auth wiring，统一相对 `/api/v1`。
- 保持组件 props、状态、结构和样式；修复 loading/error/cache/form submit。
- 旧部署文案在原容器内更新为 Cloud deployment。

出口：现有页面由真实 Worker API 驱动，UI 冻结检查无结构变更。

## Phase 5：本地验证

- local D1 migrations、lint、typecheck、unit、integration、frontend、build、Playwright。
- 同状态捕获 `tests/visual-after-cloudflare/` 并与 baseline 比较。
- 修复所有阻塞缺陷与明显视觉漂移。

出口：本地质量门和 `docs/UI_MIGRATION_VERIFICATION.md` 通过。

## Phase 6：安全删除旧路线

- 完成并运行 `scripts/safe-remove-old-stack.mjs`。
- 按 `docs/TECH_MIGRATION_REMOVALS.md` 逐项删除旧 backend、Windows/Tailscale/SQLite 服务脚本和旧专用测试/文档。
- 保留/迁移所有 UI、共享类型、业务语义和 G 类数据。
- 全仓搜索活跃代码/当前文档中的 FastAPI、Uvicorn、SQLAlchemy、Alembic、Tailscale、localhost:8787、Task Scheduler、PyInstaller 和本机长期服务器引用。
- 再次完整 build/test/visual check。

出口：旧实现从工作树移除；历史记录可提旧架构，但当前路径不依赖它。

## Phase 7：Cloudflare 登录与部署

- 运行 `npm run deploy:current`；必要时只在浏览器登录步骤暂停。
- 创建实例配置与 D1、remote migrations、必要 Secret、实例构建与部署。
- 远程 health、D1 读写、核心流程、SPA/static 和截图验证；打开实际 URL。

出口：真实 Worker URL 可用且远程 smoke 通过；报告不输出 Secret 或 D1 ID。

## Phase 8：GitHub 与开源

- publication check、公开配置检查、README/文档/CI/Dependabot。
- 检查或创建 GitHub remote；必要时只在浏览器登录/授权暂停。
- 提交并推送迁移分支，不 force push；填充 Deploy to Cloudflare 按钮。

出口：公共仓库无实例配置/Secret/数据，可由他人部署到自己的账户。

## Phase 9：最终 QA

- 远程核心流程、页面、手机/桌面、深/浅色与截图最终对比。
- 检查隐私数据流、outbound fetch、文档和 publication check。
- 记录真实完成条件与唯一剩余 iPhone 真机步骤。

## 完成条件

必须同时满足：UI/导航/主要页面未重设计；旧 FastAPI/本机/Tailscale/localhost 路线已删除；Worker、D1、Static Assets 同源；相对 API；本地和远程 migrations；build/主要测试/Playwright/视觉回归；实际 Cloudflare 部署、health 和 D1 读写；实例配置未提交；公共仓库无 Secret 且一键部署可用；未操作项目外文件；真机边界如实说明。

任一未实际完成的条件不得标记完成。

## 最终报告格式

### Migration Summary

原/新技术路线；保留 UI；修改的数据访问、API 与数据库层。

### Files

新增、修改、删除、明确保留的 UI、未处理注意项。

### Safety

PROJECT_ROOT；项目外/系统文件操作情况；Git checkpoint；删除清单；publication check。

### Tests

lint、typecheck、unit、integration、frontend、Playwright、visual regression、build 的真实命令结果。

### Cloudflare

登录状态、Worker/D1 名称、migrations、Worker URL、health、远程 smoke；不得输出 Secret 或 database ID。

### GitHub

remote、branch、commit、公共 URL、Deploy to Cloudflare 按钮。

### UI Verification

页面、viewport、视觉变化、技术文案变化和有意差异。

### Remaining Manual Step

只列无法自动完成的 iPhone Shortcuts Personal Automation 设置。最终报告不能只写 “Migration completed”。
