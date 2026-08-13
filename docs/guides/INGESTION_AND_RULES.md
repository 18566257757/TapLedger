# 交易导入、归一化、规则与防重复

## 统一导入管线

所有来源必须调用同一个 Worker 兼容的 `TransactionIngestionService`，包括 Shortcut、Manual PWA、Simulator 和未来 CSV import：

```text
Source
  ↓
Validation
  ↓
Money normalization
  ↓
Merchant normalization
  ↓
Payment method matching
  ↓
Merchant rules
  ↓
Duplicate detection
  ↓
Review status
  ↓
D1 transaction / batch
  ↓
ImportEvent
```

Worker route 不得直接堆放这些业务规则。D1 写入和对应 ImportEvent 应在可用的事务/批次边界中保持一致，并对可重试输入给出稳定结果。

## 缺失字段处理

Shortcut 传来的 Wallet 字段都视为可能缺失。服务端最低要求 `amount`；`client_event_id` 应由 Shortcut 生成 UUID，中文兼容请求缺失该字段时由 Worker 根据核心交易字段生成稳定哈希 ID：

- 缺少 currency：使用 `AppSetting.base_currency`，并标记该值来自默认配置。
- 缺少 merchant：保存为 `Unknown Merchant`，进入 Review Inbox。
- 缺少 card：Payment Method 留空，进入 Review Inbox。
- 缺少 transaction date：使用 `captured_at`。

## MerchantNormalizationService

至少实现：

- 去除首尾空白并折叠重复空格。
- Unicode normalization 和 apostrophe 统一。
- 生成大写匹配表示，安全移除标点。
- 保留原始 `merchant_raw`。
- 保守识别店铺编号和常见公司后缀。
- 不得过度归一化，避免不同商户被错误合并。

例如 `McDonald's Central`、`MCDONALDS HK 0123`、`MCDONALD’S - IFC` 可以在规则充分明确时归一为 `MCDONALDS`。所有归一化规则都必须可单元测试，中文商户也必须安全处理。

## Payment Method 匹配

使用 `PaymentMethod.shortcut_match_text` 与原始卡片名称进行可解释、可测试的匹配。未知卡片保留 `card_raw_name`、不自动猜测敏感卡片信息，并进入 Review Inbox。

新建 Payment Method 未显式填写 `shortcut_match_text` 时，默认使用其 `display_name` 作为后续 Shortcut 匹配文本。这只用于字符串包含匹配，不推断发卡行、卡号或其他敏感信息。已导入但未关联的交易继续保留原始卡名，不在部署时批量猜测或改写用户数据。

## Merchant Rule Engine

匹配顺序固定为：

1. exact，按 priority。
2. contains，按 priority。
3. regex，按 priority。
4. 历史商户映射。
5. Uncategorized。

规则可指定 Category、Payment Method、Default Purpose。用户编辑交易分类时提供 `Remember this category for this merchant`；开启后创建或更新规则。

默认示例：

```text
STARBUCKS      → Coffee
MCDONALDS      → Dining
MTR            → Transport
PARKNSHOP      → Grocery
APPLE.COM/BILL → Subscription
```

第一版不使用 AI。regex 必须进行合法性和性能保护；disabled rule 不参与匹配。

## 防重复与幂等

### 第一优先级：事件 ID

`client_event_id` 数据库唯一约束优先于任何 fingerprint。相同事件重复发送时返回已有 transaction ID 和 `already_processed`，不得创建第二笔。

### 第一层：30 秒内自动化重复

当以下值相同且时间相差不超过 30 秒：

- normalized merchant
- amount_minor
- currency
- card raw name 或 payment method

处理方式：

- 不创建第二笔交易。
- 返回已有 transaction ID；Shortcut 收到 success。
- 创建或更新必要的 ImportEvent，结果标记为 duplicate。

### 第二层：30 秒至 5 分钟

相同条件在 30 秒之后、5 分钟以内再次出现时仍保存交易，但设置 `review_status = duplicate_candidate` 并放入 Review Inbox。

### 超过 5 分钟

不自动判为重复。不得因为金额和商户相同而永久去重；要允许用户短时间内在同一商户进行两笔真实、同金额交易。

## Review 状态

以下情况应进入 Review Inbox：

- Uncategorized
- Unknown Merchant
- Unmapped Card
- Missing Information
- Duplicate Candidate

用户确认、补全或处理完成后交易离开 Inbox。创建规则、确认不是重复、删除确认的重复项和批量处理都必须走明确的业务服务并留有必要审计摘要。
