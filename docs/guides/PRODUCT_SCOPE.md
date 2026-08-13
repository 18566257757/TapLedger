# 产品范围与迁移目标

## 产品定位

TapLedger 是单用户、自部署的自动记账 PWA。Apple Wallet 交易可触发 iPhone Shortcuts，把金额、币种、时间、商户、卡片、可选地点/用途和唯一事件 ID 发送到用户自己的 Cloudflare Worker；数据只进入该用户自己的 D1。

本次工作是现有项目的技术迁移，不是新项目：现有页面、交互和产品结构全部保留，只替换本机 FastAPI/SQLite/Tailscale 数据层与部署路线。

## 目标运行拓扑

```text
用户浏览器 / 用户 iPhone Shortcut
  ↓ HTTPS
用户自己的 Cloudflare Worker
  ├─ Workers Static Assets：现有 React/Vite PWA
  ├─ /api/v1/*：Worker API
  └─ DB binding：用户自己的 Cloudflare D1
```

应用只有一个 origin：

```text
https://<user-worker>.workers.dev/
├─ 现有 PWA 页面
└─ /api/v1/*
```

前端直接使用相对 `/api/v1/...`；不得依赖本机服务器、Tailscale、VPN、端口转发、固定 Worker URL 或项目作者的服务。

## 必须保留的产品能力

- 首次管理员设置、登录、退出和密码修改。
- 手动交易、Shortcut 导入、编辑、删除、筛选和 Review Inbox。
- Categories、Payment Methods、Merchant Rules、归一化与防重复。
- 日/月/年/自定义统计、多币种分离、CSV 导出、JSON 备份与恢复。
- Shortcut token、模拟导入、Diagnostics、PWA、离线状态、深浅色和多语言。

## 非目标与边界

- 不建立项目作者中央 API、中央数据库、统一账号、遥测或交易收集。
- 不接入 Google Analytics、Sentry、PostHog、广告、AI API、远程字体或 CDN。
- 不为了迁移更换 React Router、状态/表单/图表/图标/CSS 方案。
- Codex 不能代替用户在 iPhone 上静默创建 Personal Automation；该步骤最终由用户真机完成。
- TapLedger 不是银行对账单，最终金额以银行记录为准。
