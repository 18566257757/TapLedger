# TapLedger 实施进度

更新时间：2026-08-13（Asia/Shanghai）

## 技术路线变更状态

用户已将目标路线调整为：保留现有 React/Vite UI，迁移到 Cloudflare Workers + Cloudflare D1 + Workers Static Assets，并以每个用户自己的 Cloudflare 账户自部署。

本轮已完成工程规范重组：根 `AGENTS.md` 与 `docs/guides/` 已切换到新路线，建立 UI 冻结、项目目录边界、数据保护、旧路线安全删除、公共/实例配置隔离、部署、开源发布与最终验收要求。三份只服务旧路线且已被新指南替代的指南已删除，记录见 `docs/TECH_MIGRATION_REMOVALS.md`。

**实际实现尚未迁移。** 当前 `backend/`、PowerShell 本机脚本和 SQLite 测试数据仍是旧实现/回退基线。按新安全门，必须先完成 Worker/D1 替代实现、本地测试和视觉回归，才可逐项删除。不得把指南完成误写为 Cloudflare 构建或部署完成。

## 当前结论

TapLedger 的本地优先 MVP 已实现：FastAPI/SQLite 后端、React PWA、统一交易导入、复核与规则、分析与导出、认证、备份恢复及 Windows 运维脚本均可运行。当前环境能够安全验证的本机功能已经过实际测试；Tailscale、计划任务、电源计划和 iPhone 真机步骤未擅自配置或虚构为已验证。

当前正式服务状态：**运行中**。本机地址固定为 `http://127.0.0.1:8787`，仅监听 `127.0.0.1`。正式数据库目前需要首次创建管理员，账号和密码由用户本人设置。

### 2026-08-13 交互与移动端收口

- 首页桌面版与手机版已按 `docs/design/` 中的设计稿重新对齐：开放式趋势区、独立复核栏、最近交易表格/列表、手机品牌栏、复核横幅、固定新增按钮和底部交易编辑器均已落地。
- 交易编辑器增加打开后金额聚焦、Escape 关闭、背景滚动锁定、移动端“更多信息”折叠和粘性保存操作；交易筛选在手机端改为可折叠并显示生效数量。
- 修复生产配置下本机 `http://127.0.0.1` 被错误设置 `Secure` session cookie 的认证问题；现在按请求实际传输协议设置 cookie，并仅信任来自回环代理的 HTTPS 转发头。
- 390×844 CSS px 的真实浏览器检查结果为 `clientWidth=390`、`scrollWidth=390`；编辑器表单 `clientWidth=388`、`scrollWidth=388`，无横向溢出。
- 设计对照和浏览器验收记录见 `design-qa.md`；Tailscale 与 iPhone 真机访问仍未配置或声称已验证。

## 阶段状态

### Phase 1：基础与金额 — 已完成

- 已建立 `backend/`、`frontend/`、`scripts/`、`docs/` 分层及 Alembic 迁移。
- SQLAlchemy 2 模型覆盖用户、交易、导入事件、类别、支付方式、商户规则和设置。
- 金额以整数最小货币单位和 ISO 4217 币种保存；Money Service 包含 Decimal、JPY、NaN/Infinity 和舍入测试。
- Alembic 实测：`4e6994f373f0 (head)`；`alembic check` 返回无新增迁移操作。

### Phase 2：认证与 Shortcut API — 已完成

- 已实现首次管理员设置、Argon2 密码、同源 session、CSRF、登录/退出和会话恢复。
- Shortcut token 单独鉴权、轮换后仅显示一次；导入 API 具有限流、验证和 `client_event_id` 幂等保护。
- 已实现带明确标记的模拟导入，正式环境不自动写入演示数据。

### Phase 3：导入规则与 Review — 已完成

- 所有来源进入统一导入管线；已实现商户归一化、卡片匹配、规则优先级、重复检测和 ImportEvent 结果。
- Review Inbox 支持单笔编辑/确认、删除重复候选，以及批量选择、批量分类和确认。
- 类别和支付方式支持创建/归档，商户规则支持创建及启用/停用；后端另提供完整 PATCH 接口。

### Phase 4：React PWA — 已完成

- 已实现登录、首页、交易、复核、分析、设置和统一交易编辑器。
- 桌面使用 276px 侧栏，手机使用底部四项导航、浮动新增按钮和底部编辑面板。
- PWA 包含 manifest、service worker、离线 App Shell、显式待同步队列、深浅主题和 safe-area 处理。
- 真实浏览器检查：390×844 CSS px 手机视口下 `clientWidth=390`、`scrollWidth=390`，无横向溢出。

### Phase 5：分析与导出 — 已完成（高级比较仍可增强）

- Insights 支持日、月、年、自定义周期，并显示按币种净支出、笔数、平均金额、最大单笔、类别、商户和支付方式分布。
- 多币种分开返回和显示，不假设汇率；首页提供本月趋势图。
- CSV 使用 UTF-8 BOM，并支持 JSON 导出。
- 尚未实现“与上一周期比较”和独立的 Daily/Monthly average 图表，列为后续增强，不影响当前统计口径。

### Phase 6：Windows 运维 — 代码完成，本机安全项已验证

- 16 个 PowerShell 脚本全部通过语法解析。
- `setup.ps1 -NoStart` 已在隔离数据目录中实际完成依赖、迁移和生产构建。
- 启动、状态、健康检查、停止均已实测；监听确认为 `127.0.0.1:8787`，停止后父/子 Python 进程和监听端口均消失。
- 隔离运行目录中已实际创建并校验 135168 字节 SQLite 备份；恢复、迁移和恢复后 health 也已实际跑通。最后一次校验备份为 `tapledger-2026-08-12-195436.sqlite3`。
- Tailscale 当前未安装；未运行 Serve。`TapLedger` 与 `TapLedger Daily Backup` 计划任务未安装。电源计划未修改。

### Phase 7：iPhone 指南 — 文档完成，真机待验证

- 已提供 PWA 安装、简单 Shortcut、可靠 Outbox、Wallet 自动化及 Tailscale 私有访问文档。
- 文档字段与当前 API 一致，并明确网页不能代替用户创建 Personal Automation。
- 当前没有 iPhone 真机和 Tailnet 环境，因此未声称 PWA 安装、Wallet 通知解析或后台自动化已验证。

### Phase 8：收尾 — 主要项完成，仍有已知限制

- 主要导航、页面标题、交易编辑器和核心状态支持 English、简体中文、繁体中文；默认跟随浏览器且可覆盖。
- 已实现深浅主题、键盘可用控件、文字/图标状态语义、离线提示和本地资源约束。
- 仍有少量设置页辅助文字和高级筛选标签是英文；高级目录编辑/排序/图标选择、规则搜索/测试以及独立 Automation Setup 页面尚未全部图形化。
- 前端测试目前覆盖核心格式化、本地化、交易行和离线队列，不等同于指南中列出的完整组件测试矩阵。

## 实际验证证据

| 项目 | 实际结果 |
| --- | --- |
| 后端测试 | Python 3.13.2；`36 passed`；总覆盖率 `81%` |
| 前端测试 | Vitest：`4` 个文件、`7 passed` |
| 生产构建 | TypeScript + Vite 成功；`2440 modules transformed` |
| Playwright | Desktop Chromium 与 iPhone 14 WebKit 项目：`2 passed` |
| Alembic | 当前 revision 为 head；schema diff 检查通过 |
| Windows 脚本 | `16` 个 `.ps1` 文件语法解析通过 |
| Health | 实际返回 `{"status":"ok","version":"0.1.0"}` |
| 监听 | 实际只监听 `127.0.0.1:8787` |
| 备份/恢复 | 隔离数据库中创建、完整性校验、恢复、迁移和恢复后健康检查均成功 |
| 本机工具 | Node.js 24.13.1；npm 11.8.0；Tailscale 未安装 |

## 数据与环境边界

- 正式默认数据库：`%LOCALAPPDATA%\TapLedger\data\tapledger.sqlite3`
- 正式默认日志：`%LOCALAPPDATA%\TapLedger\logs\`
- 正式默认备份：`%USERPROFILE%\Documents\TapLedger Backups\`
- 本轮端到端和恢复验证使用隔离目录 `runtime/e2e/` 与 `runtime/e2e-backups/`；两者已被 Git 忽略，不应当作正式账本。
- 项目根 `.env` 已由设置脚本生成并被 Git 忽略；不得提交或在报告中记录其中的密钥。

## 尚需用户环境完成的验收

1. 安装并登录 Tailscale 后，显式运行 `scripts/configure-tailscale.ps1`，确认私有 HTTPS 地址；不得启用 Funnel。
2. 用户决定后再安装开机启动和每日备份计划任务，并按需选择是否调整 Windows 电源计划。
3. 在真实 iPhone 上按文档安装 PWA、创建 Shortcut 和 Wallet Personal Automation，验证通知文本与地区/银行格式。
4. 如需覆盖完整产品规范，继续补齐上一周期比较、设置页全部本地化、目录高级编辑和更完整的前端/端到端用例。
