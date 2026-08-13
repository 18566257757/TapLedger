# 隐私架构

TapLedger 的运行数据流只有：

```text
用户设备 → 用户自己的 Cloudflare Worker → 用户自己的 D1
```

Static Assets 和 API 同源。应用代码没有面向项目作者的 API、数据库、账户系统、遥测、分析、广告、错误追踪或 AI 服务，也不加载远程字体/CDN。正常记账功能不向第三方域名发送金额、商户、支付方式、类别、地点、备注或交易数量。

D1 保存交易、目录、规则、设置、会话哈希、Shortcut token 哈希、导入事件和备份快照。完整卡号、CVV、Apple Pay token 与付款凭证不属于 schema。位置默认关闭，只有用户显式提供时才保存。

Cloudflare 作为用户选择的基础设施提供商仍会按其服务条款处理网络与存储元数据；每位部署者应独立评估账户地区、D1 jurisdiction、保留政策和适用法规。
