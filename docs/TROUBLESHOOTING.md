# 故障排查

## 本地开发失败

```powershell
npm ci
npm run db:migrate:local
npm run typecheck
npm run build
```

确认 Node.js 满足 `>=20.19`，并且使用项目内依赖。删除或覆盖数据库、实例配置前必须先备份，不要用全局清理命令。

## Cloudflare 部署失败

```powershell
npm run wrangler -- whoami
npm run wrangler -- d1 migrations list DB --remote --config wrangler.instance.jsonc
```

若未登录，重新运行 `npm run deploy:current` 并在浏览器完成登录。不要把 Wrangler 凭证、account ID、D1 ID 或完整命令输出发布到 issue。

## 页面可开但 API 失败

访问部署 URL 的 `/api/v1/health`。正常响应是 `status: ok`。确认构建使用实例配置、远程 migrations 已应用且 binding 名为 `DB`。SPA 深链应返回 HTML，而不存在的 `/api/*` 应返回 JSON 404。

## Shortcut 返回 401/503

在 Settings 轮换 token，把新值更新到 iPhone Authorization header。503 表示尚未配置 token；401 表示缺失、错误或已轮换。不要把 token 放 URL。

如果响应包含 `client_event_id: Invalid input; amount: Invalid input`，说明旧 Worker 尚未支持中文字典键，或部署尚未更新。当前版本兼容 `事件ID`、`金额`、`币种`、`商户`、`交易名称`、`卡片`、`时间` 和 `位置`；金额可以直接使用 Shortcuts 的数字“数量”。
