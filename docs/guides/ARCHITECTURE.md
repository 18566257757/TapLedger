# Cloudflare 目标架构与仓库结构

## 固定技术路线

- 前端：保留当前 React、TypeScript、Vite、React Router、TanStack Query、图表库、图标库、CSS、Vitest、React Testing Library、Playwright 和 PWA。
- 构建/运行：`@cloudflare/vite-plugin`、Cloudflare Workers、Workers Static Assets。
- 数据库：Cloudflare D1，使用版本化 SQL migrations。
- API：Worker `/api/v1/*`；只有确实简化现有路由时才采用 Hono，输入校验优先复用兼容的 Zod。
- 安全原语：Web Crypto API、HttpOnly/Secure/SameSite=Strict Cookie、D1 session。

不得为了迁移替换 UI component library、React Router、状态/表单/图表/图标/CSS 方案。依赖只有在 Workers 环境不兼容且有验证证据时才替换。

## 同源拓扑

```text
React/Vite PWA
  ↓ relative /api/v1/*
Cloudflare Worker
  ├─ API routes
  ├─ Workers Static Assets + SPA fallback
  └─ env.DB → Cloudflare D1
```

不得在前端硬编码 localhost、127.0.0.1、局域网/公网 IP、workers.dev、account ID 或 D1 ID。正常记账数据不得向第三方域名发送。

## 目标目录

在保留现有 `frontend/` UI 的前提下逐步形成：

```text
frontend/
  ├─ src/                 # 现有 UI、routes、components、hooks、types
  ├─ public/              # 现有 PWA 资产
  ├─ tests/
  └─ vite.config.ts
src/worker/
  ├─ index.ts
  ├─ routes/
  ├─ middleware/
  ├─ services/
  ├─ repositories/
  ├─ auth/
  ├─ db/
  └─ utils/
migrations/               # D1 版本化 SQL
scripts/
  ├─ deploy-current-user.mjs
  ├─ migrate-legacy-data.mjs
  ├─ publication-check.mjs
  └─ safe-remove-old-stack.mjs
tests/
  ├─ visual-baseline/
  └─ visual-after-cloudflare/
wrangler.jsonc            # 公共模板
wrangler.instance.jsonc   # 当前实例，Git 忽略
```

可根据当前 package 根位置调整物理目录，但职责与公共/实例配置边界必须保持。

## 模块边界

- 现有组件继续依赖现有 hooks/services；只替换数据访问边界。
- Worker route 负责路由、鉴权、校验、响应与服务调用，不堆积业务规则。
- 业务服务至少按需要拆分 `TransactionService`、`MerchantNormalizationService`、`MerchantRuleService`、`DuplicateDetectionService`、`AnalyticsService`、`AuthService`、`SessionService`、`ShortcutTokenService`、`ExportService`、`RestoreService`。
- D1 查询集中在可测试的 repositories/db 边界；不制造只转发一次调用的无意义 interface。
- 所有交易来源复用统一导入服务和 D1 transaction/batch 语义。
- 静态资源随 Worker 部署，不使用远程字体或 CDN。

## 配置边界

- `wrangler.jsonc`：公开模板，不含 account ID、真实 D1 ID、Worker URL 或 Secret；binding 固定名 `DB`，配置 SPA fallback 与 Static Assets。
- `wrangler.instance.jsonc`：当前用户实际部署，可含真实 D1 ID，必须 Git 忽略。
- `.dev.vars`：本地 Secret，Git 忽略。
- 本地开发使用公共配置和 local D1；远程迁移/部署显式使用实例配置，防止测试误写生产 D1。
