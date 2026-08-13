# Windows 安装指南

## 要求

- Windows 10 或 Windows 11
- PowerShell 5.1 或更新版本
- Python 3.13
- Node.js 24 LTS 与 npm
- 可选：Tailscale Windows 客户端

## 安装

1. 打开普通 PowerShell，不需要管理员权限。
2. 进入项目根目录：`Set-Location 'D:\自动记账项目'`。
3. 运行 `.\scripts\setup.ps1`。
4. 等待依赖安装、Alembic 迁移、PWA 构建和 health check 完成。
5. 打开 `http://127.0.0.1:8787`，创建唯一的本地管理员。

`setup.ps1` 可重复运行。已有 `.env`、数据库、管理员和 Shortcut token 不会被覆盖。缺少依赖时脚本会停止并列出组件；只有显式传入 `-InstallPrerequisites` 才会尝试使用 winget。

## 自动启动和每日备份

确认应用可正常启动后，可显式注册当前用户的计划任务：

```powershell
.\scripts\install-startup-task.ps1
.\scripts\install-backup-task.ps1
```

第一个任务在登录 30 秒后后台启动 TapLedger；第二个任务每天 02:00 创建经 SQLite 完整性检查的备份。重复运行会更新同名任务，不会创建重复项。

卸载任务：

```powershell
.\scripts\uninstall-startup-task.ps1
.\scripts\uninstall-backup-task.ps1
```

## 可选电源设置

电脑关机或睡眠时 iPhone 无法访问 TapLedger。若希望接通电源时保持主机运行，可在理解影响后显式执行 `.\scripts\configure-power.ps1 -Apply`。脚本只关闭“接通电源时自动睡眠”，保留显示器超时和电池设置，并保存原值。恢复用 `.\scripts\configure-power.ps1 -Restore`。主安装不会修改电源计划、防火墙或路由器。

## 更新

将新版本文件放入项目后运行 `.\scripts\update.ps1`。脚本会先创建备份，再更新固定依赖、迁移、构建，并只在原服务已运行时重启。
