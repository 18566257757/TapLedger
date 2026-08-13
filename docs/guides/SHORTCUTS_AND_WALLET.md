# iPhone Shortcuts、Wallet 与 PWA

## 实现边界

Worker 可以提供 API、token 生成、Automation 设置页、Shortcut Blueprint、测试请求与模拟交易；Codex 不能替用户静默创建 iPhone Personal Automation。每台 iPhone、地区、iOS 版本和卡片的 Wallet 字段必须真机核对。

该边界不阻塞 Cloudflare 构建、部署和远程验证。除真机步骤外继续自动完成。

## Endpoint 与认证

Automation 页面保留现有布局，从 `window.location.origin` 生成当前用户自己的：

```text
<current-origin>/api/v1/shortcut/transactions
```

Shortcut 使用：

```http
Authorization: Bearer <token>
Content-Type: application/json
```

不得显示项目作者固定地址、localhost、Tailscale 地址或把 token 放 URL。D1 只保存 token hash。

## 统一字段

继续提交：`schema_version`、`client_event_id`、`amount`、`currency`、`merchant`、`card`、`transaction_date`、`captured_at`、`purpose`、`location_name`、`latitude`、`longitude`、`source`。每个事件使用唯一 UUID；所有 Wallet 字段按可能缺失处理，规则见 `INGESTION_AND_RULES.md`。

中文系统可直接使用字典键：`版本`、`事件ID`、`金额`、`币种`、`商户`、`卡片`、`时间`、`捕获时间`、`交易名称`、`位置`、`纬度`、`经度`、`来源`。Worker 在独立 adapter 中转换这些别名，不改变标准英文 API；繁体键也兼容。数字金额会转为十进制文本，位置对象只提取名称和有效经纬度。未提供 `事件ID` 时 Worker 会生成稳定派生 ID，但可靠 Outbox 仍应显式使用“生成 UUID”。

真实 Wallet 输出中的 `HK$9.00` 等带币种金额可直接使用；时间支持 `2026年8月13日 15:06`、`2026/9/15 GMT+8 09:41:00` 和 `2026-09-15T09:41:00+08:00`。无显式偏移的本地时间按账本 Settings 中的时区解释；多行地址文本可以直接作为 `位置`。

## Simple Capture

```text
Wallet Transaction Automation
→ 取得 Shortcut Input
→ 生成 UUID
→ 组合 Dictionary
→ Get Contents of URL (HTTPS POST JSON + Bearer token)
→ 成功时静默或只在失败时通知
```

文档必须给出当前部署 origin、字段映射、错误处理和小额真机验证步骤。

## Reliable Outbox

网络或 Cloudflare 暂时不可用时，可在 `Shortcuts/TapLedger/` 保存本地待发送事件：

- 每事件唯一 UUID；引号、换行与中文不能破坏序列化。
- 文件名/内容不保存 token。
- 只有 Worker 返回 success 或 `already_processed` 才删除事件。
- Batch API 返回成功、重复、失败与剩余数量；失败事件继续保留。
- 未真机验证时明确标注，不能把模拟测试写成真机通过。

## PWA 与离线

保留现有 manifest、service worker、offline fallback、theme colors、standalone、safe-area 与安装界面。静态资源由 Workers Static Assets 提供，不使用第三方 CDN。

离线时可打开缓存 App shell，明确显示未连接；手动新增可继续使用现有 pending queue，恢复连接后由用户确认同步，不假设 iOS 后台同步可靠。

## 最终真机步骤

部署和文档完成后，唯一允许保留的手工步骤是：

```text
Shortcuts
→ Automation
→ Transaction
→ 选择卡片
→ Run Immediately
→ Run TapLedger Capture
```

不得声称已完成 PWA 安装、Wallet 通知解析或 Personal Automation，除非确实在用户真机验证。
