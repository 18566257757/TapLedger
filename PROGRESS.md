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
| unit | 7 个文件，23/23 通过 |
| Worker integration | 1 个文件，6/6 通过；含中文 Shortcut 字段、数字金额、位置对象、派生事件 ID 与幂等重试 |
| frontend tests | 7 个文件，23/23 通过 |
| 本地 Playwright 核心流程 | 6/6 通过；按桌面/手机或视觉证据用途有意跳过 8 项 |
| 远程 Playwright | 视觉捕获 2/2；核心桌面/手机 2/2；额外 smoke 3/3 通过。首次远程运行发现并修复商户末尾数字误截断 |
| production build | Worker 142 modules、client 2440 modules；成功 |
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
- 17:10 真机复核显示白边已消失，但 iOS 原生日期外框仍越过内容区约 `20px`。补充修复把手机日期输入明确限制为 `100dvw - 40px`，关闭其 WebKit 原生外框尺寸接管，并保留 `type="date"` 与居中日期值。
- 新增测试直接比较日期输入和指标卡片左右边界。本地 iPhone 16 Pro WebKit 实测四者均为 `left/right = 20/382px`、宽 `362px`，页面 `clientWidth/scrollWidth = 402/402`。
- Cloudflare 自动部署成功；线上入口已确认引用新 CSS `index-BeO4q5lz.css`，该文件实际包含视口宽度限制和 WebKit 外观修复。远程首页、D1 health、SPA deep link、页面内容、控制台与登录页交互复核通过；真实设备结果待用户刷新后确认。

## 紧凑手机日期控件与桌面设置卡片修复

- 2026-08-13：根据 17:24 的 iPhone 16 Pro 真机反馈，将单列日期区优化为周期独占第一行、开始和结束并排第二行；三控件统一 `46px` 高，并保留 WebKit 横向溢出保护。
- 本地 WebKit `402 × 874` 实测页面 `clientWidth/scrollWidth = 402/402`；周期宽 `362px`，开始和结束各宽 `176px`、间距 `10px`，所有左右边界与下方内容卡片对齐，未复现白边或裁切。
- 桌面 Settings 的“并排卡片一起打开”是 Grid 默认等高拉伸造成的视觉错觉，不是多个 `details` 同时拥有 `open` 属性。设置网格现顶部对齐，展开一张卡片不会再改变相邻收起卡片的高度。
- 新增桌面回归测试验证目标卡片独立展开、相邻卡片仍收起且高度不变；iPhone 专项和桌面设置专项 Playwright 均通过。
- 自动部署脚本复跑 lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、production build 与 publication check 后成功发布；远程 D1 无待执行 migration，首页、health 和 SPA deep link smoke 全部通过。线上 CSS 已切换为 `index-BieqmI9l.css` 并确认包含本次布局规则。

## 手机深浅色主题切换

- 2026-08-13：手机版 Settings 的“偏好设置”新增颜色主题切换，直接复用桌面现有 ThemeProvider；浅色、深色选择立即生效并保存到本机，刷新后保持。
- 控件仅在手机断点显示，沿用现有主题开关、Sun/Moon 图标和中英繁三语文案；桌面侧栏主题切换、导航和页面结构不变。
- Browser 复核确认设置页身份、偏好卡片和控制台健康；浏览器连接不支持移动视口截图，因此使用项目现有 iPhone 16 Pro WebKit `402 × 874` 补充精确验证。
- iPhone 专项 Playwright 1/1 通过；实测深色与浅色状态的 `clientWidth/scrollWidth` 均为 `402/402`，刷新后主题持久化，交互阶段无控制台 error 或 warning。
- 自动部署脚本复跑 lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、build 与 publication check 后成功发布；远程 D1 无待执行 migration，首页、health、SPA deep link 通过。线上 CSS `index-BnW11hX8.css` 和 Settings 代码块已确认包含本次主题控件与状态逻辑。

## Shortcut 嵌套交易字典兼容

- 2026-08-13：根据真实 iPhone Shortcuts 返回的 `amount: Invalid input`，确认现有请求把字段放在顶层 `交易信息` 字典中；旧 adapter 只读取请求顶层，因此金额未进入 schema，交易没有写入 D1。
- Shortcut adapter 现支持解包一层 `交易信息`、`交易資訊`、`交易资料`、`交易資料`、`transaction`、`transaction_info` 或 `transactionInfo` 对象；标准顶层字段仍优先，未知深层结构不会递归展开。
- Worker 集成测试使用与真机相同的 `交易信息 → 字典` 结构，验证 `HK$10.25`、商户、用途、卡片、GMT+8 时间和多行位置均正确进入统一导入管线；同时验证顶层 `currency` 优先于嵌套 `币种`。Worker integration 6/6 通过。
- 自动部署脚本复跑 lint、typecheck、unit 21/21、Worker integration 6/6、frontend 21/21、build 与 publication check 后成功发布；远程 D1 无待执行 migration，首页、health 与 SPA deep link smoke 通过。远程验证没有使用或写入用户真实交易，也没有读取 Shortcut Token。

## Shortcut 字符串字典兼容

- 2026-08-13：使用 Cloudflare 实时 tail 接收用户的空输入复现，脱敏结构确认真机发送的是 `顶层 JSON → 交易信息:string`，而不是真正的嵌套 JSON object。日志只记录已知字段名和值类型，未记录金额、商户、位置或 Token。
- Adapter 现兼容包装字段内的 JSON 字符串与 Shortcuts 原生键值文本；只提取白名单交易字段，支持中英文冒号、等号、分号和跨行位置。标准顶层字段仍优先。
- 新增单元诊断测试保证日志不包含交易值；Worker 集成测试分别覆盖嵌套 object、序列化 JSON 和原生键值文本，包括金额、时间与多行位置的实际持久化结果。
- 完整 `deploy:current` 通过：lint、typecheck、unit 23/23、Worker integration 6/6、frontend 23/23、production build 和 publication check；远程 D1 无待执行 migration，生产首页、D1 health 与 SPA deep link smoke 通过。部署后两次空输入均被新 adapter 确认为 JSON 字符串并识别出金额、商户、卡片、时间、交易名称和位置；因金额为空而按设计拒绝，未写入 D1。

## Wallet 卡片显示与支付方式分析

- 2026-08-13：对生产 D1 执行脱敏只读检查，确认最新真实 Wallet 交易已保存卡片原始名称，但 `payment_method_id` 为空；当前 1 个支付方式没有配置 `shortcut_match_text`，因此无法自动关联。未读取或输出真实卡名、金额、商户或 Token。
- 手机交易行现在直接显示 Wallet 卡片名称；交易编辑器在未关联时显示“Wallet 识别：…（未关联）”，仍允许用户手动选择现有支付方式。
- 分析页保留现有“支付方式”卡片，改为“已关联名称 → Wallet 原始卡名 → 未指定”的分组顺序，不再把不同未关联卡合并。新建支付方式默认使用显示名称作为 Shortcut 匹配文本。
- 本地 lint、typecheck、unit/frontend 24/24、Worker integration 6/6、Playwright 6/6 可执行项通过（8 项按桌面/手机或视觉证据用途跳过），production build 与 publication check 通过。专项 iPhone 16 Pro WebKit 流程确认交易行、编辑器和支付分析同时正确，页面 `clientWidth/scrollWidth = 402/402`；桌面 `1440/1440`，目标交互无控制台 error/warning。
- `deploy:current` 重新执行后 Cloudflare 发布成功，远程 D1 无待执行 migration，首页、D1 health 与 SPA deep link smoke 通过。部署后对最新真实 Wallet 交易执行脱敏只读 SQL，结果为 `has_wallet_card=1`、`grouped_by_wallet_card=1`、`grouped_as_unmapped=0`；未改写交易或公开卡名与金额。

## GitHub 默认分支保护

- 2026-08-13：为 GitHub 默认分支创建并启用 `Protect migration/cloudflare-d1` ruleset，目标使用 GitHub 的 Default branch 条件，当前实际匹配 `migration/cloudflare-d1`。
- 规则只启用 `Restrict deletions` 与 `Block force pushes`；未启用 Pull Request、状态检查、签名提交或部署门禁，因此继续允许当前非强制的直接推送维护流程。
- 在 GitHub 规则详情页复核为 Active、适用 1 个目标；仓库首页原有的 “branch isn't protected” 提示与 “Protect this branch” 入口均已消失。

## 最终状态与尚未完成

- Cloudflare OAuth、远程 D1 创建、三个 migration 文件、Worker 发布和远程 D1 读写已完成；首页、health、SPA 深链、首次设置、桌面/手机核心流程及远程视觉验证通过。
- GitHub 公共仓库 `18566257757/TapLedger` 已创建；`migration/cloudflare-d1` 是默认分支，迁移提交 `016194a` 和 CI 修复提交 `cd1ecc6` 已推送，README Deploy 按钮已指向该仓库，CI 已通过。
- iPhone 上的 PWA、Shortcut 与 Wallet Personal Automation 真机操作。

未实际完成的 iPhone 真机步骤不会标记为成功。
