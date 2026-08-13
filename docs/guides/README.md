# TapLedger 工程指南索引

根目录 `AGENTS.md` 是 Codex 自动发现的精简入口；本目录保存按任务加载的具体规范。指南描述迁移目标，实际完成度只记录在 `PROGRESS.md`。

## 每次任务的共同前提

- 唯一操作范围是 `PROJECT_ROOT`，不得扫描或修改项目外路径。
- 当前 UI 是唯一视觉基准，不再做设计探索、重构或视觉更新。
- 旧实现只有在 Cloudflare 替代实现通过本地验证后才能按清单删除。
- 除 Cloudflare/GitHub 登录与授权、iPhone 真机操作外，普通实现步骤连续推进。

## 任务 → 必读指南

| 任务 | 必读指南 |
| --- | --- |
| 明确产品边界、目标拓扑或非目标 | [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) |
| 任何前端、页面、交互或响应式改动 | [UI_FREEZE.md](UI_FREEZE.md) |
| 审计、Git 快照、数据保护或删除旧路线 | [MIGRATION_SAFETY.md](MIGRATION_SAFETY.md) |
| 目录、技术选型、模块边界或同源拓扑 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| API contract、金额、模型、导出或前端数据接线 | [DATA_AND_API.md](DATA_AND_API.md) |
| D1 schema、SQL migration 或旧 SQLite 数据迁移 | [D1_DATA_MIGRATION.md](D1_DATA_MIGRATION.md) |
| 导入、商户归一化、规则、Review 或去重 | [INGESTION_AND_RULES.md](INGESTION_AND_RULES.md) |
| 登录、Cookie、Shortcut token、隐私或安全头 | [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) |
| Wrangler、实例配置、D1 创建或 Cloudflare 部署 | [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) |
| GitHub、公开模板、CI、Secret 扫描或一键部署 | [OPEN_SOURCE_RELEASE.md](OPEN_SOURCE_RELEASE.md) |
| iPhone Shortcut、Wallet 或 PWA 安装 | [SHORTCUTS_AND_WALLET.md](SHORTCUTS_AND_WALLET.md) |
| 测试、API contract、视觉回归或远程 smoke | [TESTING_AND_ACCEPTANCE.md](TESTING_AND_ACCEPTANCE.md) |
| 阶段顺序、完成条件、进度或最终报告 | [DELIVERY_PLAN.md](DELIVERY_PLAN.md) |

一项任务可能跨多个主题。例如迁移 Shortcut 导入时，至少读取 `DATA_AND_API`、`D1_DATA_MIGRATION`、`INGESTION_AND_RULES`、`SECURITY_AND_PRIVACY` 与 `SHORTCUTS_AND_WALLET`。

## 新需求章节映射

| 原始章节 | 归档指南 |
| --- | --- |
| 一、最高优先级；二、安全检查；三、审计 | `UI_FREEZE.md`、`MIGRATION_SAFETY.md` |
| 四、目标路线；五、保留前端；六、Worker API | `ARCHITECTURE.md`、`DATA_AND_API.md` |
| 七、D1 迁移 | `D1_DATA_MIGRATION.md` |
| 八、认证与 Shortcut；十三、隐私 | `SECURITY_AND_PRIVACY.md`、`SHORTCUTS_AND_WALLET.md` |
| 九、公共/实例配置；十一、部署 | `CLOUDFLARE_DEPLOYMENT.md` |
| 十、删除旧路线；十四、Git 安全 | `MIGRATION_SAFETY.md`、`docs/TECH_MIGRATION_REMOVALS.md` |
| 十二、GitHub；十四、发布安全 | `OPEN_SOURCE_RELEASE.md` |
| 十五、测试与视觉不变 | `TESTING_AND_ACCEPTANCE.md`、`UI_FREEZE.md` |
| 十六、文档；十七、Apple 边界 | `SHORTCUTS_AND_WALLET.md`、`OPEN_SOURCE_RELEASE.md` |
| 十八至二十、顺序、完成条件、报告 | `DELIVERY_PLAN.md` |

## 维护规则

- 需求变化时修改最具体的指南，并同步检查根 `AGENTS.md` 和本索引。
- 计划与目标写入指南；真实命令、结果、失败和未验证项写入 `PROGRESS.md`。
- 用户安装教程放在 `docs/`，工程约束放在 `docs/guides/`，二者不要混用。
- 迁移历史允许提到旧架构，但当前安装与运行方式最终只能指向 Cloudflare。
