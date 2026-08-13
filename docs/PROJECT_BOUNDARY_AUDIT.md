# Project boundary audit

PROJECT_ROOT：`D:\自动记账项目`

## 受控结果

- 源码、配置、D1 本地状态、迁移备份、测试、构建、实例配置和发布文件均以 PROJECT_ROOT 为目标。
- 旧栈删除脚本拒绝根目录、项目外路径、`.git`、UI/测试/数据目录和符号链接；18 个目标逐项删除。
- 未删除系统文件、其他项目、用户文档、系统软件或项目外数据库。
- Cloudflare OAuth 通过 Wrangler/Chrome 正常授权；未读取或输出落盘凭证。

## 已知边界偏差

1. 在建立项目内 Wrangler wrapper 之前，Wrangler 的一次失败命令自动把自身日志写入默认用户配置目录。没有读取、复制或删除该日志；后续 Wrangler 状态与日志均固定在项目 `.wrangler/`。
2. 一次远程视觉命令从仓库根直接调用 Playwright，而旧测试用 `process.cwd()` 计算路径，13 张测试截图因此写到 `D:\test-results\remote-cloudflare`，位于 PROJECT_ROOT 外。发现后立即停止比较，没有读取、移动或删除这些项目外文件。测试随后改为由测试文件位置解析 PROJECT_ROOT，并对最终路径做边界检查；远程截图在项目内被忽略的 `test-results/` 重新生成。

以上两项是工具默认行为/测试路径缺陷造成的写入偏差，必须在最终报告中如实披露，不能声称“项目外零写入”。
