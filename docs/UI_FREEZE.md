# TapLedger UI 冻结基准

冻结日期：2026-08-13（迁移分支 `migration/cloudflare-d1`）

## 基准环境

- 旧实现隔离地址：`http://127.0.0.1:8788`，数据目录仅使用项目内 `runtime/e2e/`。
- 语言：English（`tapledger-language=en`）。
- 桌面视口：1512×1045 CSS px。
- 手机视口：390×844 CSS px。
- 主题：Light 与 Dark。
- 捕获命令：`npx playwright test tests/e2e/visual-freeze.spec.ts --project=desktop`。
- 实际结果：2 tests passed；13 张基准截图。

## 路由与组件树

```text
main.tsx
└─ QueryClientProvider
   └─ ThemeProvider
      └─ LocaleProvider
         └─ AuthProvider
            └─ BrowserRouter
               └─ App
                  ├─ /login         → AuthPage
                  └─ ProtectedShell → OnlineStatus + AppShell
                     ├─ /           → HomePage
                     ├─ /transactions → TransactionsPage + TransactionEditor
                     ├─ /insights   → InsightsPage
                     ├─ /review     → ReviewPage + TransactionEditor
                     └─ /settings   → SettingsPage
```

共享组件：`AppShell`、`OnlineStatus`、`EmptyState`、`TransactionRow`、`TransactionEditor`。手机底部四项导航与桌面侧栏由同一 `AppShell` 响应式切换。

## 视觉入口与资产

- 全局 CSS：`frontend/src/styles.css`，由 `frontend/src/main.tsx` 唯一引入。
- 字体：`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`；代码字体为 Cascadia Mono/Consolas。
- 图标：现有 `lucide-react`，不得更换。
- 图表：现有 `recharts`，不得更换。
- PWA：`frontend/public/manifest.webmanifest`、`sw.js`、`app-icon.svg`。
- 颜色、surface、shadow 等 tokens 位于 `:root` 与 `[data-theme="dark"]`。
- 主要断点：`980px` 与 `720px`；`prefers-reduced-motion` 保持有效。

## 页面可见层级

- Login/Setup：TapLedger mark、标题、状态行、用户名/密码、主按钮和 privacy footer。
- Home：问候/手机品牌栏、月份、净支出、趋势、Review 摘要、最近五笔交易、新增按钮。
- Transactions：标题、筛选区、活动列表、响应式新增按钮与统一编辑器。
- Insights：周期与日期、按币种摘要、类别、商户与 Payment Method 图表。
- Review：批量栏、review cards、编辑/确认/删除重复操作。
- Settings：Automation、Categories、Payment methods、Merchant rules、Data & backups、Server status、Preferences；迁移仅允许在原容器内替换部署技术文案与数据来源。

## 基准截图

`tests/visual-baseline/`：

- `desktop-light-login.png`
- `desktop-light-home.png`
- `desktop-light-transactions.png`
- `desktop-light-transaction-editor.png`
- `desktop-light-insights.png`
- `desktop-light-settings.png`
- `desktop-light-review.png`
- `desktop-dark-home.png`
- `mobile-light-home.png`
- `mobile-light-transactions.png`
- `mobile-light-transaction-editor.png`
- `mobile-light-review.png`
- `mobile-dark-home.png`

## 冻结规则

迁移期间不得修改组件结构、CSS、tokens、图标、字体、导航、断点或交互。允许改动仅限 API/data/auth wiring、类型、错误处理和原容器内的旧部署技术文字。迁移后使用同一测试脚本与数据状态输出到 `tests/visual-after-cloudflare/` 并逐图比较。
