# Wallet Personal Automation

1. 先创建并手动验证 `TapLedger Capture`，参见 [SHORTCUT_SIMPLE_SETUP.md](SHORTCUT_SIMPLE_SETUP.md)。
2. 打开“快捷指令”→“自动化”→“新建个人自动化”。
3. 选择 Wallet/Transaction 触发器（实际名称随 iOS、语言和地区变化）。
4. 选择目标 Wallet 卡片以及可用的 Tap/Transaction 触发条件。
5. 添加“运行快捷指令”，选择 `TapLedger Capture`，并把触发器提供的 Transaction 作为输入。
6. 若系统允许，选择立即运行或关闭“运行前询问”；保留失败通知。
7. 完成一笔小额 Apple Pay 测试，在 TapLedger 的 Review queue 和服务器诊断中确认。

每台 iPhone 都需要单独配置。实体银行卡直接刷卡、现金、支付宝与微信支付不会通过 Wallet 自动化进入第一版，需手工记账。Apple Pay 网上/App 内支付是否触发取决于设备、地区、发卡行和 iOS 版本，必须真机验证。最终金额仍以银行记录为准。

> 截图占位：自动化触发器、卡片选择、Run Shortcut 和立即运行设置。
