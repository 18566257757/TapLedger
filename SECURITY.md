# Security Policy

## Supported version

安全修复仅针对默认分支的最新版本。

## Reporting

请通过仓库托管平台的私密安全报告功能提交漏洞。不要在公开 issue 中附上密码、Cookie、CSRF、Shortcut token、Cloudflare account/database ID、Worker 实例 URL、数据库或真实交易。

## Security model

- 单用户自部署；没有项目作者控制的中央服务。
- PBKDF2-SHA-256 密码哈希，随机盐；session、CSRF 与 Shortcut token 只存哈希。
- HttpOnly/Secure/SameSite=Strict Cookie、CSRF 校验、安全响应头、1 MiB 请求体限制。
- Shortcut Bearer token 独立于网页登录，可轮换；导入速率限制与 `client_event_id` 幂等。
- D1 外键、CHECK/UNIQUE 约束和恢复前校验；金额使用整数最小单位。
- CI 不接收生产 Cloudflare Secret，只使用 GitHub-hosted runner。

部署者负责保护自己的 Cloudflare/GitHub 账户、启用多因素认证、审查依赖更新并维护独立备份。
