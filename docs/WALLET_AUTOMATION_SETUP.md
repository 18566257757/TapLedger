# Wallet Personal Automation

先按 [SHORTCUT_SETUP.md](SHORTCUT_SETUP.md) 创建并手动验证 `TapLedger Capture`。随后在 iPhone 上手动完成：

1. Shortcuts → Automation → 新建 Personal Automation。
2. 选择 Transaction/Wallet 触发器（名称取决于 iOS、语言、地区和发卡行）。
3. 选择目标卡片。
4. 选择 Run Immediately。
5. 添加 “Run Shortcut”，选择 `TapLedger Capture`，把触发器的 Transaction 作为输入。
6. 保留失败通知，完成一笔清楚标注的小额测试，在 Review Inbox 确认结果。

Codex 和网页无法静默创建 iPhone Personal Automation。Apple Pay 网上/App 内付款是否触发取决于设备与地区，必须真机验证；实体卡、现金及其他支付渠道仍可能需要手工记账。
