# Tailscale 私有 HTTPS

TapLedger 后端始终只监听 `127.0.0.1:8787`。Tailscale Serve 在 Windows 主机上终止 HTTPS，并把同一 Tailnet 内的请求反向代理到本机回环地址；无需路由器端口转发。

## Windows

1. 从 [Tailscale 官方 Windows 安装页](https://tailscale.com/docs/install/windows) 安装客户端。
2. 登录你自己的 Tailnet，确认状态为 Connected。
3. 启动 TapLedger，并运行 `.\scripts\health-check.ps1`。
4. 运行 `.\scripts\configure-tailscale.ps1`。
5. 如果浏览器打开 Tailscale 授权页面，按提示为 Tailnet 启用 HTTPS/Serve。
6. 脚本会读取并显示实际的 `https://<设备名>.<tailnet>.ts.net` 地址，同时写入本机 `.env`。

脚本先运行 `tailscale version` 与 `tailscale serve --help`，确认当前版本支持后台模式后才使用 `tailscale serve --bg 8787`。该语法和重启后恢复行为来自 [Tailscale 官方 Serve 命令文档](https://tailscale.com/docs/reference/tailscale-cli/serve)。脚本不运行 `tailscale funnel`。

## iPhone

1. 从 App Store 安装 Tailscale。
2. 使用与 Windows 相同的 Tailnet 身份登录。
3. 打开 Tailscale VPN。
4. 在 Safari 访问脚本显示的 HTTPS 地址。
5. 登录 TapLedger 后再按 [IPHONE_PWA_SETUP.md](IPHONE_PWA_SETUP.md) 添加到主屏幕。

Tailnet ACL 同样适用于 Serve。只有被你的 Tailnet 策略允许的用户和设备可以访问。

## 状态与停止

```powershell
tailscale serve status
tailscale serve status --json
tailscale serve reset
```

执行 reset 会移除这台设备现有的全部 Serve 配置，运行前应先检查状态。电脑关机/睡眠、家庭断网、Windows 上 Tailscale 离线或 iPhone 关闭 Tailscale VPN 时，远程访问不可用；已有 SQLite 数据不会因此丢失。
