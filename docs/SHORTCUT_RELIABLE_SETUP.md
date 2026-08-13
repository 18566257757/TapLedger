# Shortcut 可靠 Outbox 模式

该模式用于 Windows 睡眠、断网或 Tailscale 暂时离线时保留事件。服务端 batch API 和 `client_event_id` 幂等已经实现；iPhone 文件操作仍必须在目标设备上真机验证。

## Outbox 约定

- 目录：iCloud Drive 的 `Shortcuts/TapLedger/`
- 每笔交易一个 JSON 文件，文件名为 `<UUID>.json`
- 文件内容是 [SHORTCUT_SIMPLE_SETUP.md](SHORTCUT_SIMPLE_SETUP.md) 的单笔 JSON 字典
- token 只存在于请求头，不写入文件
- JSON 由快捷指令“字典 → JSON”能力生成，不手工拼接字符串，因此引号、换行和中文商户不会破坏格式

## `TapLedger Capture`

1. 为事件生成一次 UUID，并把同一 UUID 同时用于文件名和 `client_event_id`。
2. 先把 JSON 写入 Outbox，确认文件保存成功。
3. 尝试 POST 到 `/api/v1/shortcut/transactions`。
4. 只有收到 HTTP 成功且 `result` 为已创建结果或 `already_processed` 时，才删除对应文件。
5. 网络错误、超时、401、429 或 5xx 时保留文件并显示简短通知。

## `TapLedger Sync Outbox`

1. 读取 Outbox 下所有 `.json` 文件。
2. 每次最多选择 100 个，解析为字典列表。
3. POST 到 `/api/v1/shortcut/transactions/batch`，正文为 `{ "transactions": [ ... ] }`，请求头包含 `X-TapLedger-Token`。
4. 按响应 `results` 与原 UUID 一一对应；只删除结果为成功创建或 `already_processed` 的文件。
5. 保留失败或没有服务器确认的文件。
6. 最后显示 created、duplicates、failed 和剩余文件数。

重复同步同一 UUID 不会产生第二笔交易。不要只因为快捷指令动作“没有报错”就删除文件，必须检查服务器响应。

> 未验证声明：本项目环境没有连接用户的 iPhone，因此 Outbox 的 iCloud 文件竞争、具体动作名称和 Wallet 字段仍标记为“需要 iPhone 真机验证”。先交付并验证 Simple Capture，再启用可靠模式。
