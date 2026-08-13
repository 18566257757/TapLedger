# TapLedger

TapLedger 是一套运行在 Windows 10/11 上的本地优先个人记账系统。它接收 iPhone Shortcuts 发送的 Wallet 交易，并通过 FastAPI、React PWA 与 SQLite 提供复核、分类、分析、导出和经验证备份。

## 快速开始

在普通 PowerShell 中进入项目目录：

```powershell
.\scripts\setup.ps1
```

安装脚本会创建项目虚拟环境、安装固定依赖、迁移数据库、构建 PWA，并在 `http://127.0.0.1:8787` 启动 TapLedger。首次打开需要创建唯一的本地管理员。

常用命令：

```powershell
.\scripts\start.ps1
.\scripts\status.ps1
.\scripts\health-check.ps1
.\scripts\backup.ps1
.\scripts\stop.ps1
```

若缺少 Python 或 Node.js，先手动安装；只有你明确愿意让脚本调用 winget 时，才运行 `.\scripts\setup.ps1 -InstallPrerequisites`。

Tailscale 是可选组件，安装并登录后再运行 `.\scripts\configure-tailscale.ps1`。脚本只配置私有 Serve，不启用 Funnel。

## 数据位置

- 数据库：`%LOCALAPPDATA%\TapLedger\data\tapledger.sqlite3`
- 日志：`%LOCALAPPDATA%\TapLedger\logs\`
- 运行状态：`%LOCALAPPDATA%\TapLedger\runtime\`
- 备份：`%USERPROFILE%\Documents\TapLedger Backups\`
- 本机密钥：项目根目录 `.env`（已被 Git 忽略）

可用 `TAPLEDGER_DATA_DIR` 和 `TAPLEDGER_BACKUP_DIR` 覆盖默认位置。安装与更新脚本不会重置现有数据库、管理员或密钥。

## 安全边界

- Uvicorn 固定监听 `127.0.0.1`，不监听局域网或公网地址。
- 远程访问只通过同一 Tailnet 内的 Tailscale Serve HTTPS。
- 不使用 Funnel、公网 IP、路由器端口转发、第三方遥测、云分析、远程字体、CDN 或 AI API。
- 金额以整数最小货币单位保存；不同币种绝不直接相加。
- SQLite 文件未做应用层全盘加密，建议启用 Windows 设备加密或 BitLocker，并同等保护备份。
- TapLedger 不是银行对账单，最终金额以银行记录为准。

## 文档入口

- [完整安装](docs/INSTALL.md)
- [Tailscale 私有访问](docs/TAILSCALE_SETUP.md)
- [iPhone PWA 安装](docs/IPHONE_PWA_SETUP.md)
- [Shortcut 简单采集](docs/SHORTCUT_SIMPLE_SETUP.md)
- [可靠 Outbox 采集](docs/SHORTCUT_RELIABLE_SETUP.md)
- [Wallet 自动化](docs/WALLET_AUTOMATION_SETUP.md)
- [备份与恢复](docs/BACKUP_AND_RESTORE.md)
- [故障排查](docs/TROUBLESHOOTING.md)
- [项目实施指南](docs/guides/README.md)
- [实际验证进度](PROGRESS.md)

项目级 Codex 指令存放在根目录 [AGENTS.md](AGENTS.md)。这种放置方式遵循 [OpenAI 官方 AGENTS.md 指南](https://learn.chatgpt.com/docs/agent-configuration/agents-md)：Codex 从项目根目录到当前工作目录分层加载指令；详细主题规范由 `AGENTS.md` 路由到 `docs/guides/`，避免根指令超过默认上下文预算。
