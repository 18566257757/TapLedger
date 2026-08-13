# 数据模型、API Contract 与前端接线

## 迁移原则

先读取旧后端模型、旧 API 测试和 `frontend/src/types`。优先保留 URL、request/response、错误 shape、分页、筛选、空值、日期和金额语义；必须调整时在 hooks/services/adapter 内兼容，不把转换塞进 UI 组件。

所有前端请求使用相对 `/api/v1/...`。禁止临时 mock 替代 Worker API 后声称迁移完成。

## 数据层原则

- D1 使用版本化 SQL migrations；`client_event_id` 必须有数据库唯一约束。
- 金额长期存储为 `amount_minor INTEGER` 与 `currency_code`（ISO 4217），不得使用 JavaScript 浮点数作为持久值。
- 至少正确支持 HKD、CNY、USD、CAD、JPY、EUR、GBP；解析使用字符串/十进制语义，覆盖 JPY、舍入、NaN、Infinity 和负数规则。
- 单个部署只有一个管理员，不设计项目作者中央账号或跨实例多租户。

## 核心模型

### transactions

至少保留：

```text
id, client_event_id, type, amount_minor, currency_code,
transaction_date, captured_at, merchant_raw, merchant_normalized,
card_raw_name, category_id, payment_method_id, purpose, note,
location_name, latitude, longitude, location_source, source,
review_status, is_excluded_from_analytics, deduplication_key,
created_at, updated_at
```

交易类型：`expense`、`income`、`refund`、`transfer`、`adjustment`。来源：`wallet_shortcut`、`manual_pwa`、`csv_import`、`recurring`、`simulator`。Review：`confirmed`、`needs_review`、`missing_information`、`duplicate_candidate`。

### 其他表

- `categories`：id、name、icon、sort_order、is_system、is_archived、timestamps。
- `payment_methods`：display_name、issuer、last_four、method_type、shortcut_match_text、icon、is_archived、timestamps。
- `merchant_rules`：pattern、normalized_pattern、match_type、priority、category/payment_method/default_purpose、is_enabled、timestamps。
- `settings`：base_currency、timezone、language、week_starts_on、default_analytics_period、location_capture_enabled、setup_completed，以及 Cloud deployment/endpoint 所需非 Secret 状态；不得保留 Tailscale 专用字段作为当前配置。
- `users`、`sessions`、`shortcut_tokens`、`import_events`：满足安全指南和现有 UI contract。

字段细节以旧模型和前端实际依赖为准，不得为了 D1 随意删改。

## API 前缀与覆盖范围

统一 `/api/v1`，至少覆盖 UI 实际调用的：

```text
GET  /health
GET  /status
GET  /setup/status
POST /setup/admin
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/change-password

GET|POST|PATCH|DELETE /transactions[/...]
GET|POST|PATCH|DELETE /categories[/...]
GET|POST|PATCH|DELETE /payment-methods[/...]
GET|POST|PATCH|DELETE /merchant-rules[/...]

GET  /review
POST /review/{id}/confirm
POST /review/{id}/create-rule
POST /review/{id}/mark-not-duplicate
POST /review/{id}/delete-duplicate

GET /analytics/summary
GET /analytics/trend
GET /analytics/categories
GET /analytics/merchants
GET /analytics/payment-methods

POST /shortcut/transactions
POST /shortcut/transactions/batch
POST /shortcut/test

GET  /export/csv
GET  /export/json
POST /admin/restore/validate
POST /admin/restore
```

资源的精确 method 与返回结构优先匹配旧前端及旧 contract 测试。

## Shortcut 请求与幂等响应

继续接受现有字段：`schema_version`、`client_event_id`、`amount`（字符串）、`currency`、`merchant`、`card`、`transaction_date`、`captured_at`、`purpose`、`location_name`、`latitude`、`longitude`、`source`。

为适配中文系统语言的 iPhone Shortcuts，Worker 的请求 adapter 还接受对应中文键：`版本`、`事件ID`、`金额`、`币种`、`商户`、`卡片`、`时间`、`捕获时间`、`交易名称`、`位置`、`纬度`、`经度`、`来源`（并兼容繁体写法）。英文标准键存在时优先使用英文键。Shortcut 传入的有限非负数字金额必须在 adapter 中转为十进制字符串，再进入统一金额解析；不得把 JavaScript 浮点值直接持久化。

兼容 iOS Shortcuts 将整个字典作为一个 JSON 字段提交的结构：上述字段可以直接位于请求顶层，也可以位于 `交易信息`、`交易資訊`、`交易资料`、`交易資料`、`transaction`、`transaction_info` 或 `transactionInfo` 对象内。只解包这一层已知包装字段；若顶层同时提供字段，顶层字段优先，避免嵌套值覆盖明确的标准 API 输入。

中文 Wallet 实际输出的金额文本（例如 `HK$9.00`）和时间文本（例如 `2026年8月13日 15:06`、`2026/9/15 GMT+8 09:41:00`、`2026-09-15T09:41:00+08:00`）必须经过专用解析。带 GMT/ISO 偏移的时间使用显式偏移；无时区偏移的中文时间按当前实例 `AppSetting.timezone` 转为 UTC ISO 时间，不得按 Worker 运行区或固定服务器时区猜测；多行位置文本需原样安全保存。

`client_event_id` 仍应由 Shortcut 主动生成 UUID。为了兼容无法方便加入 UUID 动作的现有中文 Shortcut，缺失时 Worker 可根据金额、币种、商户、卡片、交易时间和用途生成不含原文的稳定 SHA-256 派生 ID；数据库唯一约束与短时间重复检测仍必须生效。

相同 `client_event_id` 重发必须返回既有 transaction ID 和 `already_processed`，不得创建第二笔。响应不得返回 Shortcut token。

## 列表、分析与导出

- 交易列表保留分页、排序、全文搜索、日期、类型、类别、Payment Method、来源、Review、币种、商户和金额范围筛选。
- 分析支持日/月/年/自定义、时区、退款和排除交易；多个币种分开返回，不伪造汇率。
- CSV 保留旧字段，正确处理逗号、引号、换行、中文、空字段和时区，并以经验证的 Excel 兼容编码输出。
- JSON backup/restore 以可移植应用数据格式实现，不暴露密码 hash、session、Shortcut token hash 或 Secret；恢复前再次验证管理员并明确确认。

## 前端数据边界

理想路径：

```text
现有 UI Component
  ↓ 保持 props/状态不变
现有 hook/service/query
  ↓ 改为相对 /api/v1
Worker route → service → D1
```

loading、empty、error、success、filter、selected、edit、delete、chart 和 review 状态都必须继续由真实 Worker API 驱动。
