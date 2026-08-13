# 本地开发

```powershell
npm ci
npm run db:migrate:local
npm run dev
```

浏览器入口由 Vite 输出，默认是 `http://127.0.0.1:5173`。这是临时开发服务器，不是生产部署方法。Cloudflare Vite Plugin 在本项目 `.wrangler/state` 使用本地 D1；远程数据不会被本地测试写入。

常用命令：

```powershell
npm run db:migrations:list:local
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:frontend
npm run test:e2e
npm run build
```

需要本地变量时复制 `.dev.vars.example` 为被忽略的 `.dev.vars`。不要在其中放真实生产凭证；不要提交它。

前端 API 边界位于 `frontend/src/lib/api.ts`，只允许相对 `/api/v1/...`。Worker 位于 `frontend/src/worker/`，D1 migrations 位于根 `migrations/`。
