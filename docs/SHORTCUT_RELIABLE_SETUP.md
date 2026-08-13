# Shortcut 可靠 Outbox

当前可靠模式说明见 [SHORTCUT_SETUP.md](SHORTCUT_SETUP.md)。每笔事件用唯一 UUID 文件名和 `client_event_id`，批量最多 100 条；只有收到逐条成功或 `already_processed` 结果后才删除本地 Outbox 文件。
