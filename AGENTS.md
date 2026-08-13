# TapLedger 项目说明

TapLedger 是单用户、自部署的自动记账 PWA。当前迁移目标是 **现有 React/Vite UI + Cloudflare Workers + Cloudflare D1 + Workers Static Assets**。每个用户只把应用和数据部署到自己的 Cloudflare 账户。

## 开始任务前

1. 把当前工作目录（非 Git 仓库时）或 `git rev-parse --show-toplevel`（Git 仓库时）记为 `PROJECT_ROOT`；所有文件操作必须限制在该目录内。
2. 先阅读 [docs/guides/README.md](docs/guides/README.md)，再按“任务 → 必读指南”读取本次任务所需文件。
3. 检查 `PROGRESS.md` 和仓库现状。指南描述目标，不能当作已经完成的事实。
4. 未明确的普通实现细节按指南默认方案连续推进；只有 Cloudflare/GitHub 登录、二次验证、账户/授权选择和 iPhone 真机操作可以暂停请用户处理。

## 不可违反的约束

- 现有界面、导航、组件、样式、断点、文案层级和交互逻辑全部冻结；只允许修改数据接线、API、类型、错误处理、环境配置和旧部署技术文案。
- 保留 React、TypeScript、Vite、React Router、TanStack Query、现有图表/图标/CSS/PWA 方案；不得重新设计或用模板覆盖 UI。
- 目标后端固定为 Cloudflare Worker，数据库固定为 D1，静态前端使用 Workers Static Assets；前端与 `/api/v1/*` 同源。
- 前端只使用相对 API 路径，不得硬编码 localhost、局域网地址、workers.dev 地址、account ID 或 D1 database ID。
- 公共 `wrangler.jsonc` 不含实例 ID 或 Secret；当前用户的 `wrangler.instance.jsonc` 必须被 Git 忽略。
- 金额长期保存为整数最小货币单位与 ISO 4217 币种；`client_event_id` 必须唯一，所有交易来源走统一导入管线。
- 不保存完整银行卡号、CVV、Apple Pay token 或付款凭证；不得加入遥测、广告、第三方分析、云错误追踪、远程字体/CDN 或 AI API。
- 不得读取、修改、移动或删除 `PROJECT_ROOT` 外的文件。Wrangler 自行保存 OAuth 凭证是登录工具的正常行为，但不得读取、复制、删除或输出凭证。
- 删除旧路线前必须遵守 [MIGRATION_SAFETY.md](docs/guides/MIGRATION_SAFETY.md) 和 [TECH_MIGRATION_REMOVALS.md](docs/TECH_MIGRATION_REMOVALS.md)，逐个验证绝对路径；用户数据库和唯一数据副本不得自动删除。
- 未实际运行的测试、迁移、部署、远程健康检查、视觉对比、GitHub 发布或 iPhone 真机步骤不得声称通过。

## 实施习惯

- 先迁移数据访问边界，保持组件 props 与现有 API contract；不得为了后端迁移简化前端。
- Worker route 只处理协议、鉴权、输入输出和服务调用，业务逻辑按现有功能拆分；避免巨型 route 和无意义抽象。
- 行为变更必须配套测试；每阶段完成后更新相关指南、用户文档和 `PROGRESS.md`。
- 优先可恢复、可验证的操作。部署与发布不得输出 Secret、真实交易、实例 ID 或认证凭证。

## 指南优先级

用户当前指令优先于本文件；本文件优先于 `docs/guides/`。主题指南冲突时以更具体者为准，并在执行前记录采用的解释。
