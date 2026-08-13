# 在 iPhone 安装 TapLedger PWA

1. 先完成 [TAILSCALE_SETUP.md](TAILSCALE_SETUP.md)，并在 iPhone 开启 Tailscale VPN。
2. 用 Safari 打开 TapLedger 私有 HTTPS 地址并登录。
3. 点击 Safari 的“共享”按钮。
4. 选择“添加到主屏幕”。若没有显示，向下滚动并编辑操作列表。
5. 名称保留为 TapLedger，点击“添加”。
6. 从主屏幕打开，确认底部导航、深色模式和新增交易编辑器正常。

PWA 外壳可被缓存，但服务器离线时不会显示新的服务端数据。离线手工新增会保存在这台设备浏览器的本地队列中，并明确提示等待确认同步；当前版本不会在后台静默上传，避免重复或未经确认地写账。

清除 Safari 网站数据会同时清除尚未同步的本地队列。请先恢复 Windows/Tailscale 连接并确认交易已进入账本。

> 截图占位：Safari 分享菜单中的“添加到主屏幕”。
