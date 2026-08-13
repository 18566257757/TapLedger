# UI migration verification

验证日期：2026-08-13

## 基准与方法

- 迁移前截图：`tests/visual-baseline/`
- Worker/D1 迁移后截图：`tests/visual-after-cloudflare/`
- 可视化差异：`tests/visual-diff/`
- 比较命令：`npm run visual:compare`
- 浏览器：同一 Playwright Chromium 运行时；同一演示数据、路由、主题和 viewport；截图时禁用动画。

## 覆盖范围

桌面 viewport `1512 × 1045`：登录、Home、Transactions、Transaction Editor、Insights、Settings、Review Inbox，以及 Home 的浅色/深色主题。Transactions、Settings 和 Review 使用 full-page 截图。

手机 viewport `390 × 844`：Home、Transactions、Transaction Editor、Review Inbox，以及 Home 的浅色/深色主题。

## 结果

- 13/13 组截图尺寸完全一致；没有页面高度、响应式断点、导航或容器布局漂移。
- `desktop-light-transactions`、`desktop-light-review`、`mobile-light-transactions`、`mobile-light-review` 为逐像素一致。
- Home 差异为 `0.0306%`（桌面）和 `0.0468%–0.0495%`（手机），仅位于同一 SVG 趋势线的抗锯齿/动画落点。
- Insights 差异为 `0.0690%`，只位于同一图表与卡片边缘的亚像素渲染；数据、尺寸、位置和颜色一致。
- Transaction Editor 差异为 `0.0082%`（桌面）和 `0.0392%`（手机），仅为打开表单时生成的当前时间文字。
- 登录页差异为 `0.1308%`，仅为固定容器内的部署状态和隐私技术文案从本机服务改为 Private D1/Cloudflare。
- Settings 差异为 `0.9951%`，页面尺寸仍为 `1512 × 2015`；差异来自同一容器内的 Cloud deployment、D1 binding、当前 origin、迁移时间和备份名称等技术/动态文字。

## 结论

现有布局、导航、字体、字号、字重、间距、圆角、阴影、图标、图表类型、卡片、表单、按钮、主题、响应式断点、页面顺序和产品交互均保留。不存在有意的视觉重设计；仅保留任务允许的技术文案和动态数据差异。

## 2026-08-13 语言与昵称专项复核

- 手机 viewport：`390 × 844`。
- 中文 Settings：自动化说明、按钮、15 个内置类别、内置标记、备份、部署状态、偏好设置、语言选项和昵称表单均显示中文。
- 英文 Settings：切换为英文后，上述区域全部恢复英文；检查未发现残留中文界面标签。
- 手机 Insights：`.insights-heading .eyebrow` 计算样式为 `display: none`，可见标题仅为“分析”；桌面仍保留原有眉题与主标题层级。
- 中文系统数据：`Dining`、`Uncategorized`、`manual_pwa`、`missing_information`、`Unmapped` 等稳定标识分别显示为“餐饮”“未分类”“手动录入”“信息缺失”“未指定”。
- 昵称：保存“测试昵称”后，桌面首页问候即时显示“下午好, 测试昵称”；登录用户名未改变。
- 新增证据：`tests/visual-after-cloudflare/mobile-light-insights-zh-CN.png` 与 `tests/visual-after-cloudflare/mobile-light-settings-zh-CN.png`。
- `npm run visual:compare` 继续比较原有 13 组基准，并将新增中文截图列为额外证据。全页 Transactions、Review 的高度会随本地测试交易数量变化；Settings 因用户明确要求新增昵称控件而有预期高度变化，不将其误报为视觉重设计。

## 远程 Worker 复核

实际部署后使用同一演示数据、viewport、路由和主题在 workers.dev 实例重新捕获 13 张截图，证据保存于被 Git 忽略的 `test-results/remote-cloudflare/`，避免把当前用户 Worker URL 发布到公共仓库。

- 远程 Playwright 捕获：2/2 通过。
- 13/13 截图尺寸与迁移前基准完全一致。
- Transactions、Review 的桌面/手机截图以及手机深色 Home 共 5 组逐像素一致。
- Home 最大差异 `0.0477%`，Insights `0.0336%`，Transaction Editor 最大 `0.0641%`；均为动态时间或亚像素渲染。
- Settings `1.0932%` 与登录页 `0.1308%` 的差异来自当前 origin、D1/部署诊断、备份时间和允许的技术文案；页面高度、容器与层级一致。

## 2026-08-13 手机分析与折叠设置专项复核

- 手机 viewport：Playwright iPhone 项目 `390 × 844`；桌面 viewport：`1512 × 1045`。
- 日期范围：周期选择器占满第一行，开始和结束日期分别位于第二行两列；自动断言确认开始字段右边界不超过结束字段左边界，`documentElement.scrollWidth === 390`。
- 图表：饼图和柱状图关闭入场动画，视觉捕获时均为完整稳定状态；点击/指针 Tooltip 使用站内 surface、边框、圆角、阴影与主题色，不再显示 Recharts 默认白框或柱状图整块光标背景。
- 柱状图：坐标轴长商户名使用单行省略，Tooltip 继续显示完整商户名和本地化金额，未修改数据或分析结果。
- Settings：桌面和手机初始状态均为 7 个折叠卡片；点击卡片标题后显示原内容，再次点击隐藏。专项 E2E 验证自动化按钮在展开时可见、收起时隐藏；完整桌面核心流程继续验证 Token、模拟导入、导出、语言与昵称。
- 专项视觉证据保存在被 Git 忽略的 `tests/visual-diff-localization/`，避免把当前实例的本地地址或动态数据发布到公共仓库。桌面捕获 1/1、手机捕获 1/1 通过。
- 这些变化是用户明确要求的响应式和交互修复；页面路由、导航、卡片视觉语言、颜色、字体、图标、数据结构和功能入口未改变。

## 2026-08-13 iPhone 16 Pro WebKit 修复复核

- 真实设备反馈确认 iOS Safari 的原生日期控件具有比 Chromium 更大的固有宽度，原先 `390px` 下“开始/结束并排”的断言不能覆盖该行为。
- 手机日期范围现改为周期、开始、结束三个字段各占一整行；不改变字段、顺序、样式或数据逻辑，只移除会触发原生控件溢出的并排约束。
- Playwright 手机项目明确使用 WebKit 和 iPhone 16 Pro 的 `402 × 874` CSS viewport；断言三个字段自上而下排列，每个标签和控件均位于 `0–402px` 内。
- 根节点、`body` 与 `#root` 均限制横向溢出；手机端 `:root` 与 `body` 使用同一主题画布背景，避免 Safari 回弹或异常溢出时露出固定浅色根背景。
- 本地 WebKit 实测：`documentElement.clientWidth === 402`、`scrollWidth === 402`；三个原生控件边界均为 `left 20px / right 382px / width 362px`，深色根背景与页面背景同为 `rgb(23, 25, 31)`。
- 交互复核：周期从“月”切换为“年”后值为 `year`，日期范围随之更新；当前页面控制台无 error 或 warning。
- 生产部署后公开页面用 WebKit `402 × 874` 再测：`clientWidth/scrollWidth = 402/402`，根节点与 `body` 深色背景一致，首页、health、`/insights` SPA deep link 均返回成功；线上 CSS 已确认包含手机单列日期布局和根级横向溢出保护。
- 生产实例使用用户自己的密码，项目 E2E 测试密码被正确拒绝；因此未冒充“远程已登录 Insights 截图”，也未重置或索取生产密码。日期控件的完整渲染证据来自与生产相同构建产物的本地 Worker/D1 WebKit 会话。
