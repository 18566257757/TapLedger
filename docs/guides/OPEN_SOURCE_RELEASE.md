# GitHub 开源发布与公共模板安全

## 发布前提

只有 Cloudflare 本地构建、D1 migrations、核心测试、实际部署和远程 smoke 成功后才处理 GitHub。先运行 `scripts/publication-check.mjs`；失败时不得提交或推送。

## `.gitignore` 最低要求

```text
node_modules/
dist/
.dev.vars
.env
.env.*
!.env.example
!.dev.vars.example
wrangler.instance.jsonc
.wrangler/
coverage/
playwright-report/
test-results/
*.log
*.sqlite
*.sqlite3
*.sqlite3-shm
*.sqlite3-wal
*.db
*.db-shm
*.db-wal
migration-local-data/
local-backups/
```

数据库、Secret、session、token、真实交易、备份、日志和实例配置即使被忽略，也必须检查是否曾被追踪。

## publication check

创建 `scripts/publication-check.mjs`，只扫描 PROJECT_ROOT 内将要发布/已追踪文件，发现以下内容退出码为 1：Secret/Authorization token、管理员密码、session secret、实际 workers.dev URL、Cloudflare account ID、D1 ID、数据库、真实交易/银行卡/地点、`.dev.vars`、`wrangler.instance.jsonc`、旧 Tailscale 命令、旧 localhost 服务地址、`runs-on: self-hosted`。

扫描输出只给文件与风险类型，不回显 Secret。迁移记录可以提旧架构，但当前安装文档不得继续指导旧路线。

## GitHub remote 与登录

- 已有 remote：验证目标，提交迁移分支并正常推送；不 force push、不改写远程历史。
- 无 remote：先检查 `gh auth status`。未登录才运行 `gh auth login` 并暂停用户完成浏览器登录/授权；完成后自动继续。
- `gh` 不存在时不得擅自全局安装或修改系统；Cloudflare 部署照常完成，报告 GitHub 发布待工具/登录。
- 创建公共仓库时优先沿用项目名；冲突时使用安全后缀。绝不推送实例配置、Secret、数据库或真实数据。

## 一键部署与文档

README 保留产品截图和功能介绍，并将默认安装方式改为 Deploy to Cloudflare。仓库 URL 确定后添加：

```markdown
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](
https://deploy.workers.cloudflare.com/?url=<PUBLIC_REPOSITORY_URL>
)
```

公共 `wrangler.jsonc` 必须让其他用户在自己的账户创建 Worker、D1、bindings 与 Workers Builds，不得引用当前用户实例。

## CI 与维护

- GitHub Actions 只使用 GitHub-hosted runner；禁止 `self-hosted`。
- Pull Request workflow 不获得真实 Cloudflare Secret，不对生产 D1 写入。
- CI 至少执行 lint、typecheck、unit/integration/frontend tests、build、publication check；Playwright 根据可复现环境配置。
- 添加 Dependabot 或等价依赖更新策略，不让自动更新绕过测试。

## 交付文档

最终更新/创建 `README.md`、`docs/DEPLOY_TO_CLOUDFLARE.md`、`docs/LOCAL_DEVELOPMENT.md`、`docs/DATA_MIGRATION.md`、`docs/SHORTCUT_SETUP.md`、`docs/WALLET_AUTOMATION_SETUP.md`、`docs/PRIVACY_ARCHITECTURE.md`、`docs/TECHNICAL_DECISIONS.md`、`SECURITY.md`、`PRIVACY.md`。

README 不得再把 FastAPI、Windows 长期运行、Tailscale、VPN、端口转发或 Task Scheduler 作为当前安装方式。
