# Cloudflare 配置、自动部署与远程验证

## 公共与实例配置分离

公共 `wrangler.jsonc`：

- 通用 Worker 名称，默认 `tapledger`。
- 不含 account ID、真实 D1 database ID、实际 Worker URL 或 Secret。
- D1 binding 固定为 `DB`，使用适合一键部署的自动资源配置。
- 配置 Workers Static Assets、SPA fallback 和实际实施日期的 compatibility date。

当前用户 `wrangler.instance.jsonc`：

- 从公共配置生成，只用于真实部署，可含当前 D1 ID。
- 必须在 `.gitignore`，不得提交或在报告中输出 ID。
- Cloudflare Vite Plugin 通过 `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH` 或 `configPath` 选择它。

本地用公共配置、local D1 与 `.dev.vars`；远程命令显式使用实例配置和 `--remote`。

## 自动部署入口

创建 `scripts/deploy-current-user.mjs` 与 `npm run deploy:current`。使用 Node 设置跨平台环境变量，不依赖 Unix-only 语法。Wrangler 使用项目本地依赖和 `npx wrangler`，不得要求全局安装。

流程按当前安装的 Wrangler `--help` 调整实际语法：

1. 检查 Node、npm、lockfile、Git、Wrangler 和 Cloudflare 登录状态。
2. 按 lockfile 安装依赖；依赖变化后更新 lockfile，并用干净安装复验。
3. 运行 lint、typecheck、unit、integration、frontend、build 和必要 Playwright。
4. `npx wrangler whoami`；未登录才执行 `npx wrangler login`。
5. 若需要登录，提示：

   > 现在需要你在浏览器完成 Cloudflare 登录。请不要关闭当前终端；登录完成后回到这里，我会继续自动部署。

6. 登录完成后直接继续，不再询问。
7. 不存在实例配置时安全生成；Worker 默认 `tapledger`，D1 默认 `tapledger-db`，冲突时自动附加短随机后缀。
8. 先运行 `wrangler d1 create --help`，再按当前语法创建 D1 并只更新实例配置。
9. 检查 migration status，以 binding `DB` 对远程实例应用 migrations。
10. 仅在认证实现确需部署 Secret 时生成高熵值并通过 Wrangler 写入；不得输出。
11. 使用实例配置构建和部署。
12. 从 Wrangler 结果安全提取实际 URL，运行远程验证并在浏览器打开。

## 部署后验证

至少验证：

- `GET /` 返回现有 PWA。
- `GET /api/v1/health` 正常且不泄露内部信息。
- 登录/首次设置页面与静态资源。
- SPA deep link fallback。
- D1 最小读写与实际主要流程。
- 登录、交易 CRUD、Review、analytics、Shortcut 模拟、导出/恢复验证。
- 手机/桌面、深色/浅色的远程 smoke 和截图。

Health 或主要流程失败时检查 Worker 日志（保持脱敏）、修复、重新构建/部署/验证，不得停在失败状态或把本地健康当成远程部署成功。

## 禁止事项

- 不要求用户粘贴 Cloudflare API Token、密码或 Secret。
- 不把远程 D1 用作本地默认测试库。
- 不提交或打印实例配置、database ID、account ID、OAuth 凭证。
- 不把部署动作写成修改 Windows 系统、全局安装或清理用户缓存。
