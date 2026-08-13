# 迁移安全、快照与旧路线删除

## PROJECT_ROOT 边界

开始时优先运行 `git rev-parse --show-toplevel`；不是 Git 仓库则使用当前工作目录绝对路径。将其记录为 `PROJECT_ROOT`。

所有读取、搜索、创建、修改、移动和删除必须位于 `PROJECT_ROOT` 内。不得扫描父目录或其他磁盘，不得修改系统、注册表、全局 npm/缓存、其他项目、Documents、Downloads 或 AppData 中与本项目无关的内容。

Wrangler 登录可以由 Wrangler 在用户目录保存 OAuth 凭证，但不得读取、复制、删除或打印凭证；不得要求用户把 API Token、GitHub Token、密码或 Secret 发到聊天。

## 迁移审计与 Git 快照

把当前目录、PROJECT_ROOT、Git 状态/分支/remote、Node/npm、前端框架、构建工具和 package manager 写入 `docs/TECH_MIGRATION_AUDIT.md`。

若已有 Git：先检查 `.gitignore` 与敏感文件，再创建 `migration/cloudflare-d1` 和本地 checkpoint commit `checkpoint: before Cloudflare technical migration`，不得强推。

若没有 Git：只在 PROJECT_ROOT 内初始化 Git；先创建安全 `.gitignore`，排除 Secret、数据库、日志、备份和用户数据，再创建首次 commit 与迁移分支。

任何快照都不得包含 `.env`、`.dev.vars`、Secret、Token、SQLite、真实交易、备份、日志、OAuth 凭证、实例 Worker URL 或真实 D1 ID。

## 审计分类

搜索旧技术引用并分类：

- A：必须保留的 UI。
- B：可复用的通用前端逻辑。
- C：需要迁移的数据模型。
- D：需要兼容的 API contract。
- E：明确只属于旧路线的文件。
- F：用途不明；先查引用，确认无 UI/业务依赖后再处理。
- G：用户真实数据或数据库；不得自动删除或提交，必须先备份/迁移/核对。

## 严格删除协议

新 Worker/D1 实现完成构建、本地迁移、测试和视觉回归前，不得删除旧实现。完整候选路径先写入 `docs/TECH_MIGRATION_REMOVALS.md`。

创建 `scripts/safe-remove-old-stack.mjs`，它必须：

1. 把候选路径解析为绝对路径并拒绝空值。
2. 验证路径严格位于 PROJECT_ROOT 内，且不是根目录本身、`.git`、UI 资源目录或数据保护目录。
3. 检测 symlink/junction/reparse point，不递归穿越。
4. 删除前枚举精确目标；按清单逐项处理，不使用宽泛通配符。
5. 任一检查或删除失败立即停止，不扩大范围或换用更强删除方式。

禁止 `git clean -fdx/-xffd`、根目录递归删除和任何 `*` 范围清理。用户数据库、唯一数据副本、`frontend/src`、`frontend/public`、设计资产和现有 UI 测试不得列为旧后端删除目标。

## 可暂停的唯一外部步骤

普通实现、测试、迁移和部署连续推进。只有 Cloudflare/GitHub 浏览器登录、二次验证、账户/授权选择以及 iPhone Personal Automation 真机操作可以暂停。

Cloudflare 登录提示固定为：

> 现在需要你在浏览器完成 Cloudflare 登录。请不要关闭当前终端；登录完成后回到这里，我会继续自动部署。
