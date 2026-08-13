# TapLedger 设计 QA

现有 UI 是唯一设计基准，迁移没有进行 redesign、restyle、组件替换或页面重排。

- 基准：`tests/visual-baseline/`
- Cloudflare 数据层接入后：`tests/visual-after-cloudflare/`
- 差异图：`tests/visual-diff/`
- 详细结果：[UI_MIGRATION_VERIFICATION.md](docs/UI_MIGRATION_VERIFICATION.md)

桌面 `1512 × 1045` 与手机 `390 × 844` 的 13 组截图尺寸全部一致；Transactions 和 Review 的桌面/手机截图逐像素一致。剩余差异仅为允许的技术文字、动态时间及图表亚像素落点。
