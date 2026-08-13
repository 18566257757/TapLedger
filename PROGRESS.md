# TapLedger 实施进度

更新时间：2026-08-13（Asia/Shanghai）

## 当前路线

现有 React/Vite UI 已接入 Cloudflare Worker、D1 与 Workers Static Assets。网页与 `/api/v1/*` 使用同一 origin，前端没有固定主机地址。旧 Python 后端、Windows 常驻服务脚本和旧私有网络部署文档已按受控清单删除；迁移证据数据库仍受保护并被 Git 忽略。

## 已完成

- Phase 1：Git 快照 `c3dfb5d`、技术审计、UI 冻结基准、旧数据库只读审计与删除清单。
- Phase 2–4：Cloudflare Vite Plugin、Worker 路由/服务、D1 schema/migrations、认证、交易、目录、规则、Review、分析、Shortcut、导出/备份/恢复和前端相对 API 接线。
- Phase 5：本地 D1 migration、旧演示数据迁移与幂等复核、lint、typecheck、单元/集成/前端测试、构建、Playwright 和 13 组视觉比较。
- Phase 6：停止四个已核验的旧项目进程；逐项删除 `backend/`、16 个旧 PowerShell 脚本和旧部署文档；保留数据迁移备份。
- 开源发布：公共/实例配置隔离、部署脚本、publication check、GitHub-hosted CI、Dependabot、公共仓库和迁移分支推送均已完成。

## 实测结果

| 检查 | 结果 |
| --- | --- |
| 本地 D1 migrations | 无待执行迁移 |
| lint / typecheck | 通过 |
| unit | 5 个文件，19/19 通过 |
| Worker integration | 1 个文件，5/5 通过 |
| frontend tests | 5 个文件，19/19 通过 |
| 本地 Playwright 核心流程 | 4/4 通过；按项目/视觉证据用途有意跳过 6 项 |
| 远程 Playwright | 视觉捕获 2/2；核心桌面/手机 2/2；额外 smoke 3/3 通过。首次远程运行发现并修复商户末尾数字误截断 |
| production build | Worker 141 modules、client 2440 modules；成功 |
| visual regression | 13/13 尺寸一致，4 组逐像素一致；无布局漂移 |
| npm audit | 0 vulnerabilities |
| GitHub Actions | CI #12 成功，quality job 2 分 23 秒 |

## 最终状态与尚未完成

- Cloudflare OAuth、远程 D1 创建、两个 migration、Worker 发布和远程 D1 读写已完成；首页、health、SPA 深链、首次设置、桌面/手机核心流程及远程视觉验证通过。测试生成数据已清空，实例恢复为 `setup_required=true`。
- GitHub 公共仓库 `18566257757/TapLedger` 已创建；`migration/cloudflare-d1` 是默认分支，迁移提交 `016194a` 和 CI 修复提交 `cd1ecc6` 已推送，README Deploy 按钮已指向该仓库，CI 已通过。
- iPhone 上的 PWA、Shortcut 与 Wallet Personal Automation 真机操作。

未实际完成的 iPhone 真机步骤不会标记为成功。
