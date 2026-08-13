# 数据迁移

## D1 schema

版本化 SQL 位于 `migrations/`。金额使用 `amount_minor` 整数与 `currency_code`；`client_event_id` 唯一。网页登录用户、会话和 Shortcut token 只保存哈希，不从旧实例复制。

本地应用 migration：

```powershell
npm run db:migrate:local
```

远程应用 migration：

```powershell
npm run wrangler -- d1 migrations apply DB --remote --config wrangler.instance.jsonc
```

## 迁移旧 SQLite

一次性脚本只接受 PROJECT_ROOT 内的常规 SQLite 文件，先创建项目内只读备份，再导入本地 D1、核对交易 ID/数量/金额合计和外键，最后写入源文件指纹标记：

```powershell
npm run db:migrate:legacy -- --source runtime\e2e\data\tapledger.sqlite3
```

远程导入必须显式增加 `--remote`，且要求存在被 Git 忽略、含有效 D1 binding 的 `wrangler.instance.jsonc`。不要对唯一数据副本执行迁移；先保留独立备份。

旧密码、session、token hash 和部署专用设置不会导入。验证失败时脚本不写完成标记，也不会删除源数据库。
