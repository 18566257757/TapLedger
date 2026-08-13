# Shortcut 简单采集

这是建议最先完成并用一笔小额交易验证的模式。以下步骤需要在目标 iPhone 上手工创建；Windows 网页无法代替用户创建或签名 Apple Shortcut。

## 准备

1. 在 TapLedger 的 Settings → Automation 点击“Rotate Shortcut token”。
2. 立即复制一次性显示的 token，并安全地临时保存在 iPhone 上。
3. 记下 Tailscale HTTPS 地址，例如 `https://my-pc.example.ts.net`。
4. 先在 Safari 打开该地址，确认 Tailscale 连接正常。

## 创建 `TapLedger Capture`

1. 打开“快捷指令”，新建快捷指令并命名为 `TapLedger Capture`。
2. 接收输入类型选 Wallet 的 Transaction（不同 iOS/地区名称可能不同）。
3. 添加“生成 UUID”，保存为 `client_event_id`。
4. 添加“字典”，构造以下字段：

| JSON 字段 | 快捷指令值 | 必需 |
|---|---|---|
| `schema_version` | 数字 `1` | 是 |
| `client_event_id` | 新生成的 UUID | 是 |
| `amount` | Transaction 的金额，转为文本 | 是 |
| `currency` | Transaction 的币种代码 | 可缺失 |
| `merchant` | 商户名称 | 可缺失 |
| `card` | 卡片/支付方式显示名 | 可缺失 |
| `transaction_date` | 交易日期，ISO 8601 | 可缺失 |
| `captured_at` | 当前日期，ISO 8601 | 建议 |
| `purpose` | 可选文本 | 否 |
| `location_name` | 位置名称 | 否 |
| `latitude` / `longitude` | 数字 | 否 |
| `source` | 文本 `wallet_shortcut` | 是 |

5. 添加“获取 URL 内容”：URL 为 `<私有地址>/api/v1/shortcut/transactions`，方法 POST，请求正文 JSON，正文选择上述字典。
6. 添加请求头 `X-TapLedger-Token`，值为复制的 token。不要把 token 放在 URL、文件名或 Outbox 文件内容中。
7. 仅在请求失败时显示通知；成功响应的 `result` 为 `created_confirmed`、`created_needs_review`、`duplicate_candidate` 或 `already_processed`。
8. 在快捷指令详情中关闭不必要的日志或预览，避免屏幕显示完整财务内容。

> 截图占位：字典字段、Get Contents of URL 的 POST/JSON/请求头配置。

## 验证

先运行 Settings 中显示的 `/api/v1/shortcut/test` 测试请求，再用一笔小额真实 Apple Pay 交易验证。打开 Review queue 和 Settings → Server，检查最近导入结果。字段可用性依赖 iOS 版本、地区和发卡行；未在当前 iPhone 真机验证前，不应假设网上/App 内支付一定触发。
