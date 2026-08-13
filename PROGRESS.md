# TapLedger 实施进度

更新时间：2026-08-13（Asia/Shanghai）

## 当前路线

现有 React/Vite UI 已接入 Cloudflare Worker、D1 与 Workers Static Assets。网页与 `/api/v1/*` 使用同一 origin，前端没有固定主机地址。旧 Python 后端、Windows 常驻服务脚本和旧私有网络部署文档已按受控清单删除；迁移证据数据库仍受保护并被 Git 忽略。

## 已完成

- Phase 1：Git 快照 `c3dfb5d`、技术审计、UI 冻结基准、旧数据库只读审计与删除清单。
- Phase 2–4：Cloudflare Vite Plugin、Worker 路由/服务、D1 schema/migrations、认证、交易、目录、规则、Review、分析、Shortcut、导出/备份/恢复和前端相对 API 接线。
- Phase 5：本地 D1 migration、旧演示数据迁移与幂等复核、lint、typecheck、单元/集成/前端测试、构建、Playwright 和 13 组视觉比较。
- Phase 6：停止四个已核验的旧项目进程；逐项删除 `backend/`、16 个旧 PowerShell 脚本和旧部署文档；保留数据迁移备份。
- 开源发布：公共/实例配置隔离、部署脚本、publication check、GitHub-hosted CI、Dependabot、公共仓库和迁移分支推送均已完成。

## 实测结果

| 检查 | 结果 |
| --- | --- |
| 本地 D1 migrations | 无待执行迁移 |
| lint / typecheck | 通过 |
| unit | 6 个文件，21/21 通过 |
| Worker integration | 1 个文件，6/6 通过；含中文 Shortcut 字段、数字金额、位置对象、派生事件 ID 与幂等重试 |
| frontend tests | 6 个文件，21/21 通过 |
| 本地 Playwright 核心流程 | 4/4 通过；按项目/视觉证据用途有意跳过 6 项 |
| 远程 Playwright | 视觉捕获 2/2；核心桌面/手机 2/2；额外 smoke 3/3 通过。首次远程运行发现并修复商户末尾数字误截断 |
| production build | Worker 141 modules、client 2440 modules；成功 |
| visual regression | 13/13 尺寸一致，4 组逐像素一致；无布局漂移 |
| npm audit | 0 vulnerabilities |
| GitHub Actions | CI #13 成功，quality job 1 分 51 秒 |

## 中文 Shortcut 兼容更新

- 2026-08-13：新增独立 Shortcut payload adapter，兼容简体/繁体的金额、币种、商户、交易名称、卡片、时间、位置、事件 ID 等键；标准英文键仍优先。
- Shortcuts 数字金额在持久化前转换为十进制文本；位置对象只提取名称和有效经纬度；缺少事件 ID 时根据核心交易字段生成不含原文的 SHA-256 派生 ID。
- 真实 Wallet 时间兼容 `2026年8月13日 15:06`、`2026/9/15 GMT+8 09:41:00` 与 `2026-09-15T09:41:00+08:00`；带偏移格式直接换算，无偏移中文格式使用实例时区。
- 本地 lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、build 和 publication check 均通过。重新部署后远程首页、D1 health 与 SPA deep link smoke 通过；未轮换生产 Token，未写入或删除生产交易。

## 界面语言与昵称更新

- 2026-08-13：所有用户可见的页面标题、设置卡片、交易筛选、复核状态、交易来源、确认框、离线提示和登录文案统一接入 `LocaleProvider`；简体中文、繁体中文与英文切换会立即更新当前页面。
- D1 内置类别继续保存稳定英文标识，前端按当前语言显示对应名称；用户自建类别、商户和支付方式保持原文，不擅自翻译用户数据。
- 手机分析页隐藏重复的次级眉题，只保留“分析 / Insights”主标题；桌面标题层级保持不变。
- 偏好设置新增昵称输入与保存按钮。昵称通过独立 `display_name` 字段保存，支持中文且不会改变登录用户名；首页桌面问候即时更新。
- 新增并在本地、远程 D1 成功应用 `0002_user_display_name.sql`；生产 Worker 已重新部署到原 URL，远程首页、D1 health 和 SPA 深链接检查通过。
- 实测：lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、Playwright 核心流程 4/4、视觉证据 2/2、production build 与 publication check 全部通过。

## 手机分析、折叠设置与 GitHub 展示更新

- 2026-08-13：手机 Insights 日期控件改为“周期独占一行、开始/结束并排下一行”，`390px` Playwright 断言确认字段互不相交且页面无横向溢出。
- 饼图和柱状图使用与站内深浅色主题一致的紧凑 Tooltip，取消整块点击高亮；长商户坐标轴标签单行省略、Tooltip 保留完整名称；关闭入场动画，数据加载后立即稳定显示完整图形。
- Settings 的 7 个现有模块改为原生 `details/summary` 折叠卡片，默认全部收起；点击标题区展开，再次点击收起。自动化、导出、语言、昵称等原有操作保持不变。
- README 已改为中英双语，明确突出“iOS 快捷指令 Wallet 交易个人自动化 → 用户自己的 Worker/D1”导入链路，同时说明它不是商户端 Apple Tap to Pay；加入两张已脱敏的中文快捷指令教程图。
- 新增 PolyForm Noncommercial License 1.0.0，允许个人及其他非商业用途、禁止商业使用；GitHub 仓库简介改为中英双语并加入 11 个 Topics。
- 实测：lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、Playwright 核心流程 4/4、桌面/手机专项视觉捕获各 1/1、production build 和 publication check 均通过。
- Cloudflare 远程 D1 无待执行 migration；生产 Worker 已重新部署，远程首页、D1 health 和 SPA deep link smoke 全部通过。

## iPhone 16 Pro Safari 横向溢出修复

- 2026-08-13：根据 iPhone 16 Pro 真机截图，确认 iOS Safari 原生日期输入的固有宽度会让两个并排控件超出 `402px` 视口，并露出根节点的固定浅色背景。
- 手机 Insights 的周期、开始和结束现各占一行；根节点、页面和应用根容器限制横向溢出，手机根画布背景跟随深浅主题。
- Playwright 手机项目从通用 `390px` 配置更新为明确的 WebKit `402 × 874`；专项断言覆盖控件边界、整页宽度与深色根背景一致性。
- 本地 WebKit 实测 `clientWidth/scrollWidth = 402/402`，三个控件均为 `left/right = 20/382px`，页面无白边；lint、typecheck 和 iPhone 专项 Playwright 通过。
- 生产 Worker 已重新部署到原 URL，远程 D1 migration、首页、health、SPA deep link 与部署 CSS 检查通过；生产公开登录页的 WebKit `402 × 874` 复核同样为 `clientWidth/scrollWidth = 402/402` 且根背景一致。生产密码与项目 E2E 测试密码不同，未重置密码或把无法登录的远程 Insights 误报为通过。

## 最终状态与尚未完成

- Cloudflare OAuth、远程 D1 创建、三个 migration 文件、Worker 发布和远程 D1 读写已完成；首页、health、SPA 深链、首次设置、桌面/手机核心流程及远程视觉验证通过。
- GitHub 公共仓库 `18566257757/TapLedger` 已创建；`migration/cloudflare-d1` 是默认分支，迁移提交 `016194a` 和 CI 修复提交 `cd1ecc6` 已推送，README Deploy 按钮已指向该仓库，CI 已通过。
- iPhone 上的 PWA、Shortcut 与 Wallet Personal Automation 真机操作。

未实际完成的 iPhone 真机步骤不会标记为成功。
