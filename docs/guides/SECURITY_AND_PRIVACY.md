# Workers 认证、安全与隐私

## 信任边界

每个用户部署到自己的 Cloudflare 账户；正常数据流只能是：

```text
用户浏览器 / 用户 iPhone
  ↓
用户自己的 Cloudflare Worker
  ↓
用户自己的 D1
```

不得存在项目作者中央 API、数据库、账号、统一 token、遥测或交易收集。检查所有 outbound `fetch`；正常记账功能不得把金额、商户、卡片、类别、地点、备注或交易数量发送到第三方。

## 网页认证

保留现有首次设置与登录 UI。首次设置只在 D1 中不存在管理员时开放；密码至少 12 位，以 Workers 兼容、基于 Web Crypto 的安全 KDF 保存带独立 salt 的 hash，不保存明文。

Session 使用高熵随机标识，D1 只保存 hash/必要元数据。Cookie：

- `HttpOnly`
- `Secure`（Cloudflare 正式 HTTPS）
- `SameSite=Strict`
- 合理过期、退出立即撤销、密码修改后撤销其他 session

状态变更继续使用同源与 CSRF 防护；不得信任客户端提交的管理员或审计身份。

## Shortcut token

Shortcut 使用独立 token：

```http
Authorization: Bearer <token>
```

- 使用 Web Crypto 生成至少 32 bytes 随机值。
- D1 只保存 token hash；不放 URL、前端 bundle、Git、普通日志或 ImportEvent。
- 仅在生成/轮换时向已认证管理员显示一次；新 token 生效后旧 token 失效。
- API 响应不得回显 token；UI 端点来自 `window.location.origin`。
- 旧 `X-TapLedger-Token` 若为迁移兼容临时保留，必须有明确移除计划，公共文档以 Bearer 为准。

## API 与响应防护

实现并测试：输入 schema 校验、请求体大小限制、Shortcut rate limit、CSRF、安全 Cookie、CSP、`X-Content-Type-Options: nosniff`、禁止第三方嵌入、统一安全错误 shape、敏感信息脱敏和最小化 health/status。

Cloudflare/代理提供的头只有在平台语义明确时使用；不得把任意客户端转发头当作身份。Route、日志和错误响应不得泄露 env binding、Secret、database ID、session、token hash 或完整交易正文。

## 数据最小化

不得保存完整银行卡号、CVV、Apple Pay token、付款凭证或不必要的请求体副本。卡片只保存显示名、issuer、可选末四位、Shortcut 原始名称和匹配规则。地点为可选；关闭采集后不得继续保存新位置。

不得接入 Google Analytics、Sentry、PostHog、Mixpanel、广告、远程字体/CDN、自动遥测或 AI API。应用静态资源随 Worker 部署。

## Secret 与实例配置

- `.dev.vars`、`.env*` 和 `wrangler.instance.jsonc` 必须 Git 忽略。
- Secret 通过 Wrangler 当前推荐的 secret 命令设置，不写公共 `wrangler.jsonc` 或前端环境变量。
- 首次设置若不需要部署级 Secret，不得无意义新增 `BOOTSTRAP_SECRET`。
- 不读取或输出 Wrangler OAuth、Cloudflare API Token、GitHub Token 或用户密码。

## 高风险数据操作

JSON restore 和删除全部数据必须再次验证管理员、显示独立确认并提供可恢复导出。不得把“已上传”当成“已验证恢复”；写入后必须检查计数与关键约束。

公开仓库不得包含真实 Worker URL、account ID、D1 ID、真实数据库/交易、地点、卡号、管理员密码、Secret、`.dev.vars` 或实例配置。
