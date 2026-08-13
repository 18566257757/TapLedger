# Apple Shortcut 设置

1. 在已部署的 TapLedger 登录，进入 Settings → Automation。
2. 点击 “Rotate Shortcut token”，立即复制仅显示一次的 token。
3. Endpoint 使用该页面基于 `window.location.origin` 显示的 `/api/v1/shortcut/transactions`，不要手输其他主机地址。
4. 在 iPhone Shortcuts 新建 `TapLedger Capture`，为每个事件生成 UUID，作为 `client_event_id`。
5. 用 Dictionary 构造 JSON，并通过 “Get Contents of URL” 发送 POST；请求头为 `Authorization: Bearer <token>`，正文类型 JSON。

中文 iPhone 可以直接使用以下字典键，无需改成英文：

```text
事件ID      生成 UUID（推荐；省略时 Worker 会生成稳定派生 ID）
金额        Wallet 的“数量”（数字或文本均可）
币种        HKD、港币或港元（不填则使用账本基础币种）
商户        Wallet 的“商家”
交易名称    Wallet 的“名称”
卡片        Wallet 的“卡片或凭证”
时间        Wallet 交易时间或当前日期
位置        当前位置（可选；只提取名称和经纬度）
```

简体和繁体字段名都受支持。若同一 JSON 同时出现英文标准键与中文别名，以英文键为准。

真实 Wallet 常见输出可直接提交：金额如 `HK$9.00`；时间可以是 `2026年8月13日 15:06`、`2026/9/15 GMT+8 09:41:00` 或 `2026-09-15T09:41:00+08:00`；位置可以是多行地址。Worker 优先使用时间自带的 GMT/ISO 偏移，没有偏移时才使用 Settings 中配置的时区，再转换为标准 UTC 时间。

最小正文：

```json
{
  "schema_version": 1,
  "client_event_id": "<UUID>",
  "amount": "12.34",
  "currency": "HKD",
  "merchant": "Example merchant",
  "transaction_date": "2026-08-13T12:00:00+08:00",
  "captured_at": "2026-08-13T12:00:01+08:00",
  "source": "wallet_shortcut"
}
```

可选字段包括 `card`、`purpose`、`location_name`、`latitude` 和 `longitude`。不要传完整卡号、CVV、付款凭证或 Apple Pay token。

先请求 `/api/v1/shortcut/test`，再发送一笔清楚标注的小额测试；只有收到成功 JSON 后才从 Outbox 删除事件。离线可靠模式可按最多 100 条调用 `/api/v1/shortcut/transactions/batch`，逐条依据 `results` 清理，重复 UUID 不会创建第二笔交易。

Token 只放 Authorization header，不写 URL、文件名、日志或 Outbox JSON。轮换后旧 token 立即失效。
