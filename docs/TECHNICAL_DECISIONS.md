# 技术决策

## 同源 Worker 应用

保留 React、TypeScript、Vite、React Router、TanStack Query、Recharts、Lucide 和现有 CSS/PWA。Cloudflare Vite Plugin 构建 Worker 与 Static Assets；`/api/*` 先进入 Worker，其余路径由 SPA fallback 提供。

## 数据边界

UI 组件和 props 不承担后端转换。`frontend/src/lib/api.ts` 保留页面需要的 contract，并使用相对 URL。Worker routes 负责协议与鉴权，services 负责业务，repositories 负责 D1 查询。

## 认证

密码使用 Web Crypto PBKDF2-SHA-256（独立随机盐、Cloudflare Workers 当前支持上限 100000 次，迭代数编码进 hash 以便后续迁移）；session 与 CSRF/token 值只以 SHA-256 hash 存入 D1。生产 Cookie 为 HttpOnly、Secure、SameSite=Strict。Shortcut 使用独立 Bearer token。

## 数据

金额长期存为整数最小单位，不使用二进制浮点；币种使用 ISO 4217。D1 migrations 可版本化重放。恢复通过一次 D1 batch 执行删除和插入，并在写入前验证文档结构与密码。

## 公共与实例配置

公开 `wrangler.jsonc` 不含实例标识；被忽略的 `wrangler.instance.jsonc` 只服务当前部署。Cloudflare Vite Plugin 通过 `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH` 选择实例配置。
