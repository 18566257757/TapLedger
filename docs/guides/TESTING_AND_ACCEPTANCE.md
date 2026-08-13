# 测试、API Contract 与 UI 不变验收

## 真实性

每阶段运行与改动成比例的测试并记录真实命令、退出码、数量和失败。未实际运行的 migration、build、Playwright、视觉对比、远程 health、D1 读写、部署、GitHub 发布或 iPhone 真机不得标记通过。

正式环境不写入演示数据；本地与远程测试数据明确隔离，远程 smoke 不得破坏用户真实账本。

## 质量命令

迁移后的根 package scripts 至少提供并实际运行：

- lint
- typecheck
- unit tests
- Worker/D1 integration tests
- frontend/Vitest tests
- build（Cloudflare Vite Plugin）
- Playwright core flows
- publication check

部署脚本在任何远程 mutation 前完成本地质量门；修复后重新执行失败项及相关上游检查。

## 功能覆盖

至少测试：首次设置、登录、退出、session expiry；交易列表/新增/编辑/删除/筛选；Category、Payment Method、Merchant Rule；Review Inbox；Shortcut 单笔/批量导入、token 轮换与无效 token；相同 `client_event_id`；30 秒与 5 分钟重复边界；日/月/年/自定义统计；退款/排除交易；多币种；CSV；JSON backup/restore；Settings；PWA route；SPA deep link。

Money、merchant normalization、rule priority/disabled/regex 保护、timezone/DST、中文/引号/换行和恢复失败原子性需要专门单元或集成用例。

## API Contract

使用旧前端期望、旧后端测试和 TypeScript 类型建立 contract tests，确保：

- URL/method、字段名、request/response、错误 shape。
- null/缺省值、日期格式、金额/币种语义。
- pagination、sorting、filters。
- 相同事件的稳定响应和 HTTP 状态。
- Worker API 不返回 Secret、token hash、session 或内部 D1 信息。

兼容转换放在 adapter/service 层；不得用修改 UI 输出规避 contract 差异。

## UI baseline 与视觉回归

前端改动前保存 `tests/visual-baseline/`，迁移后保存 `tests/visual-after-cloudflare/`。两组必须使用相同 route、viewport、theme、seed data、locale 和交互状态。

至少覆盖：登录/首次设置、Home、Transactions、Transaction Editor、Insights、Settings、Review Inbox；Desktop、iPhone-sized viewport、Light、Dark、手机导航和无横向溢出。

比较页面尺寸、组件位置、颜色、字体、字重、间距、圆角、阴影、图标、图表、按钮、表单、导航和 loading/empty/error。除原容器中的部署技术文案外，不应有明显视觉差异。

结果写入 `docs/UI_MIGRATION_VERIFICATION.md`：页面、viewport、发现差异、修复、有意差异和截图路径。必须实际打开基准与迁移后图片进行比较，不能把“已截图”当成“已通过”。

## Playwright 核心路径

1. 首次设置/登录。
2. 添加、编辑、删除手动交易。
3. 模拟 Shortcut import 与重复 import。
4. 未知商户进入 Review，创建规则后新交易自动分类。
5. 查看统计，导出 CSV/JSON，验证 restore 流程。
6. 设置、token 轮换、退出。
7. PWA 根路由与 SPA deep link。
8. 手机/桌面、深/浅色、无布局漂移。

## Cloudflare 本地与远程验收

本地：local D1 migrations、约束/索引、Worker routes、Static Assets、SPA fallback、组件测试、Playwright 和视觉回归。

远程：remote migrations、`GET /`、`GET /api/v1/health`、D1 安全读写、认证、主要页面、核心 CRUD、Shortcut 模拟、deep link、静态资源和远程截图。失败必须修复并重新部署/验证。

## 最终证据

`PROGRESS.md` 和最终报告只写实际证据；不得包含 Secret、实例 ID、密码、token、session、完整真实交易、卡片或地点。未验证项必须明确写明原因，且最终只允许 iPhone Personal Automation 留作手工步骤。
