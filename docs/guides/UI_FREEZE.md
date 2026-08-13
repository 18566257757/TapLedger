# 现有 UI 冻结规范

## 唯一设计基准

迁移开始时项目中已有的页面和交互是唯一设计基准。不得 redesign、restyle、modernize、visual refresh、替换设计系统、图标库或字体，也不得用模板或 Image Generation 覆盖页面。

必须原样保留：布局、导航、页面顺序、颜色、字体、字号、字重、间距、圆角、阴影、图标、图表、卡片/表格形态、表单、按钮、动画、空/加载/错误状态、深浅色、断点、手机/桌面布局、文案层级、入口和交互逻辑。

## 允许修改的前端边界

仅限：

- API 调用、query/mutation hooks、services 和数据适配器。
- authentication wiring、TypeScript 类型和缓存失效逻辑。
- 表单提交、错误处理和现有 loading 状态的数据来源。
- Vite/Worker 环境配置。
- 已有容器中涉及 localhost、本机服务器或 Tailscale 的技术文案；容器、位置、样式、图标和层级不变。

不得让 UI 组件承担 D1/Worker 数据转换；优先维持原 props、字段和 API response shape。

## 迁移前基准

修改任何前端文件前，启动现有项目，用一致 seed/data 捕获并保存到 `tests/visual-baseline/`：

- 登录或首次设置、Home、Transactions、Transaction Editor、Insights、Settings、Review Inbox。
- 桌面与手机视口。
- 浅色与深色模式。

创建 `docs/UI_FREEZE.md`，记录路由、主要组件树、CSS 入口、字体、图标、断点、可见文案和截图路径。

## 迁移后验证

使用相同 URL、viewport、theme、seed data 和页面状态保存截图到 `tests/visual-after-cloudflare/`，比较尺寸、位置、颜色、字体、间距、图标、按钮、图表、表单、导航与响应式行为。

技术文案可以更新，但不得造成容器尺寸、布局或层级漂移。发现视觉差异时先修复数据接线、loading 或响应时序，不得用重新设计解释差异。

最终在 `docs/UI_MIGRATION_VERIFICATION.md` 记录页面、视口、差异、修复和有意差异。没有真实截图对比不得声称 UI 完全一致。
