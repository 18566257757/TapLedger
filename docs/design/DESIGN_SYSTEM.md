# TapLedger Design System

Visual references:

- `tapledger-desktop-concept.png` — 1512 × 1045 desktop Home.
- `tapledger-mobile-concept.png` — 1494 × 1054 coordinated mobile Home and editor state.

## Direction

Quiet, local-first personal finance product with an original iOS-inspired sense of restraint. The UI uses true cool near-white backgrounds, black typography, indigo interaction color, open lists and hairline divisions. It must not drift into a card-grid admin dashboard.

## Tokens

- Background: `#f7f8fb` desktop shell; primary canvas `#ffffff`.
- Surface: `#ffffff`; subdued surface `#f3f5f9`.
- Text: `#101116`; muted `#646978`; faint `#9297a3`.
- Accent: `#2439d7`; hover `#1c2db7`; soft selected `#eef0ff`.
- Positive: `#0a9b68`; warning: `#d88918`; danger: `#c93c45`.
- Border: `#e2e5ec`; strong border `#cbd0da`.
- Radius: 10px controls, 14px panels, 18px sheets.
- Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 56.
- Shadow: only sheets/dialogs: `0 24px 64px rgb(18 24 40 / 14%)`.

## Typography

System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

- Display amount: 48–58px desktop, 38–44px mobile, weight 650, tight tracking.
- Page title: 38px desktop, 28px mobile, weight 650.
- Section title: 21px desktop, 17px mobile, weight 650.
- Body and controls: 15–16px, line-height 1.45.
- Metadata: 13–14px, line-height 1.4.

## Container model

- Desktop: 276px quiet sidebar, open main canvas, max content width about 1180px.
- Home upper region: trend canvas plus one unboxed vertical review rail.
- Transaction collection: table-like open rows separated by hairlines.
- Mobile: safe-area-aware single column with bottom navigation and anchored add button.
- Editor: responsive modal on desktop, bottom sheet on mobile.

## Components

- Navigation: rounded selected background only; unselected entries remain open.
- Buttons: indigo filled primary, white/transparent secondary, 44px minimum height.
- Inputs: hairline bordered, 48–52px height, 10px radius, deliberate 15px control text.
- Transaction row: circular category glyph, two-line merchant metadata, right-aligned amount.
- Status: icon plus text when consequential; never color alone.
- Charts: indigo line, faint neutral grid, no gradient fill.

## Icon inventory

Use Lucide outline icons at 1.8–2px stroke: House, ReceiptText, ChartNoAxesCombined, Settings, Plus, Sun, Moon, RefreshCw, CircleAlert, CircleHelp, Flag, ChevronRight, Search, Filter, X, WalletCards, CalendarDays, Tags, Store, FileText, Download, DatabaseBackup, ShieldCheck, Wifi, WifiOff.

## Motion

- 160ms control transitions.
- Editor sheet: 220ms ease-out translate/opacity.
- Respect `prefers-reduced-motion`.

## Allowed first-viewport copy

TapLedger; Good morning; August 2026; Net spending; HK$8,426.30; 12% less than last month; 30-day spending trend; Needs review; Recent transactions; Add transaction; View all transactions; Synced 2 min ago; Home; Transactions; Insights; Settings.
