# 故障排查

## 服务无法启动

- 运行 `.\scripts\status.ps1` 和 `.\scripts\health-check.ps1`。
- 查看 `%LOCALAPPDATA%\TapLedger\logs\tapledger.stderr.log`。
- 若提示端口 8787 被占用，使用 `Get-NetTCPConnection -LocalPort 8787 -State Listen` 查明进程；TapLedger 脚本不会结束未知进程。
- 若虚拟环境缺失，重新运行 `.\scripts\setup.ps1`。

## Migration 失败

不要删除数据库。先运行 `.\scripts\backup.ps1`；在 `backend` 目录执行 `.\.venv\Scripts\python.exe -m alembic current` 和 `.\.venv\Scripts\python.exe -m alembic check`，保留完整错误信息后再处理。

## 数据库损坏

立即停止服务，不要反复启动或复制 WAL 状态下的主文件。选择最近通过校验的备份，按 [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) 恢复。

## Tailscale 不可访问

1. 确认本机 `http://127.0.0.1:8787/api/v1/health` 正常。
2. Windows 与 iPhone 的 Tailscale 均为 Connected 且属于同一 Tailnet。
3. 运行 `tailscale status` 和 `tailscale serve status`。
4. 检查 Tailnet ACL。不要用 Funnel 或公网端口转发绕过问题。

## Shortcut 返回 401/429

- 401：token 不匹配。Settings 中轮换后必须同步更新 iPhone 请求头。
- 429：每个客户端每分钟最多 60 个 Shortcut 请求，稍后用 Outbox batch 重试。
- 不要把 token 粘贴到日志、截图或 URL。

## 离线队列未同步

当前 PWA 有意不后台静默上传。恢复服务器后重新打开编辑器，按提示确认；iPhone 可靠采集使用独立 `TapLedger Sync Outbox`。清理 Safari 网站数据前先确认队列为空。

## 安全停止

运行 `.\scripts\stop.ps1`。脚本只停止 PID 文件指向、且可执行路径和命令行都匹配项目虚拟环境与 `uvicorn app.main:app` 的进程；不匹配时会拒绝操作。
