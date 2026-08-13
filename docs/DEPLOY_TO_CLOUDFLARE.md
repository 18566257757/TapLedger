# 部署到 Cloudflare

## 当前用户自动部署

准备 Node.js `>=20.19`、npm、Git 和 Cloudflare 账户，然后在项目根目录执行：

```powershell
npm ci
npm run deploy:current
```

脚本按顺序完成环境检查、干净安装、lint/typecheck/tests/build/publication check、Wrangler 登录、实例配置、D1 创建、远程 migrations、实例构建、Worker 部署、远程 smoke test，并打开部署 URL。

首次执行会打开 Cloudflare 登录页。只在浏览器完成登录、二次验证和账户选择；不要创建或粘贴 API Token。登录凭证由 Wrangler 管理，不应读取、复制、输出或提交。

## 配置边界

- `wrangler.jsonc`：公开模板；binding 为 `DB`，不含实例 ID、地址或 Secret。
- `wrangler.instance.jsonc`：当前用户实例；由脚本创建并被 `.gitignore` 排除。
- `.dev.vars`：仅本地 Secret；本项目当前认证流程不需要部署 Secret。
- `frontend/dist/`、`.wrangler/`：本地生成并被忽略。

默认 Worker 名为 `tapledger`，D1 名为 `tapledger-db`。发生名称冲突时脚本为 D1 添加短随机后缀。远程 migration 始终通过 binding `DB` 执行。

## 手工诊断命令

```powershell
npm run wrangler -- whoami
npm run wrangler -- d1 migrations list DB --remote --config wrangler.instance.jsonc
npm run wrangler -- d1 migrations apply DB --remote --config wrangler.instance.jsonc
```

不要把命令输出中的 account/database ID 写进公共配置、截图或 issue。

## 一键部署模板

公开仓库的 README 使用 Cloudflare Deploy Button。模板部署使用公共 `wrangler.jsonc` 和 `cloudflare.bindings.DB` 元数据，让部署者在自己的账户创建 Worker、D1 和 binding。当前用户的实例配置不参与模板部署。
