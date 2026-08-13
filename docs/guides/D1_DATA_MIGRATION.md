# Cloudflare D1 与旧数据迁移

## D1 schema 与 migrations

以旧 SQLAlchemy 模型、Alembic migration、API contract 和前端 TypeScript 类型共同作为字段依据，在根 `migrations/` 建立版本化 SQL。至少覆盖 transactions、categories、payment_methods、merchant_rules、settings、users、sessions、shortcut_tokens、import_events。

必须为 `client_event_id` 建唯一约束，并为常用日期、review、category、payment method、merchant 与 rule 查询建立经过实际查询验证的索引。金额继续使用 `amount_minor INTEGER` 与 ISO 4217 币种。

本地开发只对 local D1 执行 migrations；远程操作必须显式 `--remote --config wrangler.instance.jsonc`，不得让测试默认连接生产数据库。

## 旧 SQLite 审计

发现 `*.sqlite`、`*.sqlite3` 或 `*.db` 时：

1. 只读识别 schema、记录量和是否可能包含真实数据。
2. 不提交 Git、不打印敏感记录、不修改唯一副本。
3. 在 PROJECT_ROOT 内创建只读迁移备份或受保护的 `migration-local-data/`。
4. 编写 `scripts/migrate-legacy-data.mjs`，把旧表转换为 D1 schema。
5. 在 local D1 验证每表记录数量、关键外键/唯一键和金额/币种/日期抽样。
6. 只有本地核对通过后才允许迁移远程 D1。
7. 远程迁移后再次比较计数与关键摘要；不得把完整真实交易写入日志或报告。
8. 旧数据库只有在确认不是唯一数据副本、且完成备份/迁移后，才能从工作树移出；不得自动永久删除。

若数据库为空或纯演示数据，必须以实际检查结果记录，不能推测。若不存在旧数据，明确写“未发现，跳过”，不要制造迁移结果。

## 一次性迁移脚本要求

`scripts/migrate-legacy-data.mjs` 必须：

- 只接受 PROJECT_ROOT 内明确输入路径。
- 默认只写 local D1；远程模式需要显式参数。
- 以批次和事务安全边界处理记录，失败时不留下被误认为完整的结果。
- 保持原 ID 或建立可审计映射，保留 timestamps、review 和 source 语义。
- 重复运行可检测既有迁移，不产生重复交易。
- 输出只包含计数、状态和脱敏摘要。

## JSON 备份与恢复

Cloudflare 路线不再依赖复制 SQLite 文件。应用提供版本化 JSON 导出作为用户可持有的可移植备份；导出不得包含密码/session/token hash。

恢复流程：上传 → schema/version 校验 → 只读预览和计数 → 再次验证管理员 → 明确确认 → D1 transaction/batch 写入 → 完整性/计数验证。失败必须保持原数据可恢复，不能留下半完成恢复状态。

## migrations 验证顺序

1. local migration status。
2. local migrations apply。
3. schema/constraint/index 检查。
4. integration/API contract tests。
5. 旧数据 local 导入与计数核对（如有）。
6. 登录后创建 remote D1。
7. remote migrations apply using binding `DB`。
8. 远程 D1 读写 smoke；不得在报告中输出 database ID。
