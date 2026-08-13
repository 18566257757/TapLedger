# TapLedger 设计验收记录

## 验收范围

- 设计来源：`docs/design/tapledger-desktop-concept.png`（1512×1045）、`docs/design/tapledger-mobile-concept.png`（1494×1054，含首页与编辑器组合稿）。
- 实现证据：`docs/design/implementation-desktop.png`（1512×1045）、`docs/design/implementation-mobile.png`（390×844）、`docs/design/implementation-mobile-editor.png`（390×844）。
- 状态：浅色主题；隔离 QA 数据库中的已认证管理员；桌面视口 1512×1045，手机视口 390×844。
- 比较方式：先做整页结构比较，再聚焦顶部摘要、趋势图、复核入口、最近交易、手机底栏和交易编辑器。

## 对照结果

- 桌面端保持 276px 侧栏；问候、月份、净支出、趋势图、复核栏和开放式最近交易表格的层级与设计稿一致。
- 手机端保持品牌栏、月份与金额摘要、紧凑趋势、复核横幅、最近交易列表、固定新增按钮和四项底部导航。
- 底部编辑器具有抓手、标题与关闭按钮、核心字段行和粘性保存按钮；辅助字段收进“更多信息”。
- 390px 视口下文档 `clientWidth=390`、`scrollWidth=390`；编辑器表单 `clientWidth=388`、`scrollWidth=388`，未发现横向溢出。
- 设计稿中的设备状态栏/外壳不属于应用界面，未在网页内仿造。交易金额、商户、趋势形状和复核数量来自实际隔离数据，不使用静态设计稿数据。
- 商户图形使用项目本地 Lucide 类别图标，不引入远程商标、字体或 CDN。截图右侧的绿色悬浮图标来自浏览器扩展，不属于 TapLedger。

## 迭代记录

1. 首轮发现：桌面信息顺序和卡片结构偏离；手机版缺少品牌栏、复核横幅与固定新增按钮；编辑器辅助字段过多；本机 HTTP 会话 cookie 在生产配置下错误带 `Secure`。
2. 修正：重构首页和响应式布局、交易行与编辑器；增加移动端交互；让 session cookie 依据实际 HTTPS 传输决定，并限制转发头信任边界。
3. 次轮发现：复核子项计数相互重叠、趋势与最近交易垂直节奏偏离、编辑器存在 4px 横向溢出。
4. 修正：复核分类改为互斥统计，压缩趋势区并调整间距，修正编辑器负边距与横向滚动。
5. 最终检查：未发现 P0、P1 或 P2 级设计/交互缺陷；动态业务数据和本地图标差异为可接受的 P3 差异。

## 功能与质量证据

- 浏览器交互：桌面和手机项目均完成设置/登录、打开新增交易、保存交易并在首页看到新记录。
- Playwright：Desktop Chromium 与 iPhone WebKit，`2 passed`。
- 前端组件测试：Vitest，`7 passed`；生产构建成功，`2440 modules transformed`。
- 后端：Pytest，`36 passed`，总覆盖率 `81%`。
- 控制台：未发现 TapLedger 来源的 error/warning；一次 `chrome-extension://` 错误为浏览器扩展噪声。
- 远程访问与真机：Tailscale Serve 和 iPhone 真机尚未配置，不在本次已验证范围内。

final result: passed
