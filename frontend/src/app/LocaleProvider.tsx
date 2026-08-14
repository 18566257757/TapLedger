import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type Language = 'auto' | 'en' | 'zh-CN' | 'zh-TW'

const en = {
  home: 'Home', transactions: 'Transactions', insights: 'Insights', settings: 'Settings', synced: 'Synced just now',
  lightMode: 'Use light mode', darkMode: 'Use dark mode', addTransaction: 'Add transaction', editTransaction: 'Edit transaction',
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening', ledgerReady: 'Your private ledger is ready.',
  netSpending: 'Net spending', netIncome: 'Net income', totalAmount: 'Total', chartMetric: 'Chart metric', thisMonth: 'This month', needsReview: 'Needs your review', openReview: 'Open review queue',
  recentTransactions: 'Recent transactions', latestActivity: 'The latest activity from every capture source.', viewAll: 'View all',
  noTransactions: 'No transactions yet', noTransactionsBody: 'Add one manually or connect the iPhone Shortcut when you are ready.',
  addFirst: 'Add your first transaction', ledger: 'Ledger', transactionSubtitle: 'Search, filter, edit, and verify every entry.',
  searchPlaceholder: 'Search merchant, purpose, or note', allTypes: 'All types', expenses: 'Expenses', income: 'Income', refunds: 'Refunds', transfers: 'Transfers', adjustment: 'Adjustment',
  newest: 'Newest first', oldest: 'Oldest first', highest: 'Highest amount', lowest: 'Lowest amount', allActivity: 'All activity',
  noMatches: 'No matching transactions', noMatchesBody: 'Try clearing the filters or add a new transaction.', analytics: 'Analytics',
  insightsSubtitle: 'Understand your spending without combining unlike currencies.', from: 'From', to: 'To', multipleCurrencies: 'Multiple currencies are present. Each total and chart is separated by currency; no exchange rate is assumed.',
  period: 'Period', day: 'Day', month: 'Month', year: 'Year', custom: 'Custom', transactionsCount: 'transactions', largest: 'largest', average: 'average', noActivityPeriod: 'No activity in this period',
  byCategory: 'By category', whereMoneyWent: 'Where your money went.', whereMoneyCameFrom: 'Where your money came from.', whereTotalMoved: 'Signed cash flow by category: income positive, spending negative.', topMerchants: 'Top merchants', highestDestinations: 'Your highest spend destinations.', paymentMethods: 'Payment methods', allocation: 'Spend allocation across cards and wallets.', unmapped: 'Not assigned',
  qualityControl: 'Quality control', reviewQueue: 'Review queue', reviewSubtitle: 'Confirm incomplete or possible duplicate entries before they settle into your ledger.',
  confirm: 'Confirm', edit: 'Edit', deleteDuplicate: 'Delete duplicate', queueClear: 'Review queue is clear', queueClearBody: 'Every transaction is confirmed. New uncertain imports will appear here.',
  configuration: 'Configuration', settingsSubtitle: 'Manage capture, classification, privacy, and private data.', signOut: 'Sign out', automation: 'Automation',
  categories: 'Categories', merchantRules: 'Merchant rules', dataBackups: 'Data & backups', serverStatus: 'Cloud deployment', preferences: 'Preferences',
  language: 'Language', followBrowser: 'Follow browser', english: 'English', simplifiedChinese: 'Simplified Chinese', traditionalChinese: 'Traditional Chinese',
  type: 'Type', expense: 'Expense', refund: 'Refund', amount: 'Amount', currency: 'Currency', merchant: 'Merchant', category: 'Category',
  selectCategory: 'Select category', paymentMethod: 'Payment method', selectMethod: 'Select method', walletCardUnmapped: 'Wallet: {card} (not linked)', dateTime: 'Date & time', purpose: 'Purpose', note: 'Note',
  location: 'Location', latitude: 'Latitude', longitude: 'Longitude', excludeAnalytics: 'Exclude from analytics', source: 'Source', optional: 'Optional',
  saveTransaction: 'Save transaction', saving: 'Saving...', delete: 'Delete', closeEditor: 'Close editor', confirmed: 'Confirmed', uncategorized: 'Uncategorized', noPayment: 'No payment method',
  setupPrivate: 'Set up your private ledger', welcomeBack: 'Welcome back', username: 'Username', password: 'Password', createAdmin: 'Create administrator', signIn: 'Sign in',
  uncategorizedTransactions: 'Uncategorised transactions', missingDetails: 'Missing details', potentialDuplicates: 'Potential duplicates', lessThanLastMonth: 'less than last month', moreThanLastMonth: 'more than last month', noPreviousPeriod: 'No previous-month comparison yet', monthlyChart: 'Monthly net spending chart', monthlyMetricChart: 'Monthly {metric} chart', trendEmpty: 'Your selected trend will appear here.', spendingTrend: '30-day spending trend', metricTrend: '30-day {metric} trend', viewAllTransactions: 'View all transactions', review: 'Review', moreInformation: 'More information', hideInformation: 'Hide information', firstUseHint: 'First use: create your private administrator before signing in.', showPassword: 'Show password', hidePassword: 'Hide password', passwordHint: 'Use at least 12 characters. Only a salted password hash is stored.',
  loadingTapLedger: 'Loading TapLedger...', loadingView: 'Loading view...', privateDatabase: 'Private D1', baseCurrency: 'Base currency', timezone: 'Timezone', selfHostedPrivacy: 'Self-hosted · No analytics · Private database', authenticationFailed: 'Authentication failed',
  primaryNavigation: 'Primary navigation', tapLedgerHome: 'TapLedger Home', colorTheme: 'Color theme', selectMonth: 'Select month',
  filters: 'Filters', transactionFilters: 'Transaction filters', transactionType: 'Transaction type', sortTransactions: 'Sort transactions', reviewStatus: 'Review status', minimumAmount: 'Minimum amount', maximumAmount: 'Maximum amount', clearFilters: 'Clear filters',
  walletShortcut: 'iPhone Shortcut', manualPwa: 'Manual entry', simulator: 'Simulator', csvImport: 'CSV import', recurring: 'Recurring',
  reviewConfirmed: 'Confirmed', reviewNeedsReview: 'Needs review', reviewMissingInformation: 'Missing information', reviewDuplicateCandidate: 'Duplicate candidate',
  merchantExample: 'e.g. STARBUCKS', sessionExpired: 'Your session needs to be refreshed.', saveFailed: 'Could not save transaction.', deleteFailed: 'Could not delete transaction.', savedOffline: 'Saved on this device. Confirm sync when the Cloud service is online.', deleteTransactionConfirm: 'Delete this transaction? This cannot be undone.', cloudUnavailable: 'Cloud service unavailable. New manual transactions stay on this device until you confirm sync.',
  clearSelection: 'Clear selection', selectAll: 'Select all', selectedCount: '{count} selected', categoryForSelected: 'Category for selected transactions', keepCurrentCategories: 'Keep current categories', confirmSelected: 'Confirm selected', selectMerchant: 'Select {merchant}', deleteDuplicateConfirm: 'Delete this duplicate candidate? This cannot be undone.',
  automationDescription: 'Private endpoint for your iPhone Shortcut.', importUrl: 'Import URL', rotateShortcutToken: 'Rotate Shortcut token', sendSimulatedImport: 'Send simulated import', copyTokenNow: 'Copy this token now', copy: 'Copy', activeCategories: '{count} active categories', builtIn: 'Built in', archive: 'Archive', newCategory: 'New category', add: 'Add',
  paymentMethodsDescription: 'Cards and wallets recognized by imports.', displayName: 'Display name', lastFour: 'Last 4', classificationRules: '{count} classification rules', priority: 'priority', disable: 'Disable', enable: 'Enable', merchantContains: 'Merchant contains', noCategory: 'No category',
  dataBackupsDescription: 'Exports are never uploaded by TapLedger.', pendingTransactions: '{count} transactions waiting on this device', confirmSync: 'Confirm sync', exportCsv: 'Export CSV', exportJson: 'Export JSON', creating: 'Creating...', backupNow: 'Back up now', noBackups: 'No backups yet.', deleteAllFinancialData: 'Delete all financial data', backupBeforeDelete: 'A verified backup is created first. Administrator and preferences are retained.', administratorPassword: 'Administrator password', typeDeleteAllData: 'Type DELETE ALL DATA', deleteAllData: 'Delete all data',
  cloudDiagnostics: 'Live diagnostics for this Cloudflare deployment.', service: 'Service', database: 'Database', databaseSize: 'Database size', pendingReviews: 'Pending reviews', lastImport: 'Last import', lastBackup: 'Last backup', versionUptime: 'Version / uptime', databaseBinding: 'Database binding', deploymentUrl: 'Deployment URL: {url}', cloudInfoUnavailable: 'Cloud deployment information is unavailable.', checking: 'Checking...', noneYet: 'None yet', minutes: '{count} min', healthy: 'Healthy',
  preferencesDescription: 'Appearance and regional display settings.', nickname: 'Nickname', nicknameDescription: 'Shown in greetings. Your sign-in username stays unchanged.', saveNickname: 'Save nickname', savingNickname: 'Saving...', nicknameUpdated: 'Nickname updated.', nicknameUpdateFailed: 'Could not update nickname.', rotateTokenConfirm: 'Rotate the Shortcut token? The current iPhone Shortcut will stop importing until you update it.', tokenRotated: 'Shortcut token rotated. Copy it now; it will not be shown again.', tokenRotationFailed: 'Token rotation failed.', simulateConfirm: 'Create one clearly labeled simulated transaction for testing?', simulatedAccepted: 'Simulated import accepted: {result}', simulationFailed: 'Simulation failed.',
  archiveCategoryConfirm: 'Archive category “{name}”?', archiveMethodConfirm: 'Archive payment method “{name}”?', updateFailed: 'Update failed.', verifiedBackupCreated: 'Verified backup created: {name}', backupFailed: 'Backup failed.', deletedAfterBackup: '{count} transactions deleted after backup {name}.', deleteOperationFailed: 'Delete failed.', syncCompleted: '{count} offline transactions synced with Cloud confirmation.', deleteAllConfirm: 'Permanently delete all financial data after creating a backup?',
  categoryDining: 'Dining', categoryCoffee: 'Coffee', categoryGrocery: 'Grocery', categoryTransport: 'Transport', categoryShopping: 'Shopping', categoryEntertainment: 'Entertainment', categoryHousing: 'Housing', categoryUtilities: 'Utilities', categorySubscription: 'Subscription', categoryTravel: 'Travel', categoryHealth: 'Health', categoryEducation: 'Education', categoryWork: 'Work', categoryOther: 'Other', categoryUncategorized: 'Uncategorized',
  methodCreditCard: 'Credit card', methodDebitCard: 'Debit card', methodTransitCard: 'Transit card', methodCash: 'Cash', methodDigitalWallet: 'Digital wallet', methodBankTransfer: 'Bank transfer', methodOther: 'Other', matchExact: 'Exact', matchContains: 'Contains', matchRegex: 'Regular expression',
} as const

type Key = keyof typeof en
type Translation = { [K in Key]: string }

const zhCN: Translation = {
  home: '首页', transactions: '交易', insights: '分析', settings: '设置', synced: '刚刚已同步',
  lightMode: '使用浅色模式', darkMode: '使用深色模式', addTransaction: '新增交易', editTransaction: '编辑交易',
  goodMorning: '早上好', goodAfternoon: '下午好', goodEvening: '晚上好', ledgerReady: '你的私人账本已就绪。',
  netSpending: '净支出', netIncome: '净收入', totalAmount: '总额', chartMetric: '图表指标', thisMonth: '本月', needsReview: '待你复核', openReview: '打开复核队列',
  recentTransactions: '最近交易', latestActivity: '来自所有采集来源的最新记录。', viewAll: '查看全部',
  noTransactions: '暂无交易', noTransactionsBody: '可手动新增，或准备好后连接 iPhone 快捷指令。',
  addFirst: '新增第一笔交易', ledger: '账本', transactionSubtitle: '搜索、筛选、编辑并核对每一笔记录。',
  searchPlaceholder: '搜索商户、用途或备注', allTypes: '全部类型', expenses: '支出', income: '收入', refunds: '退款', transfers: '转账', adjustment: '调整',
  newest: '最新优先', oldest: '最早优先', highest: '金额从高到低', lowest: '金额从低到高', allActivity: '全部记录',
  noMatches: '没有匹配的交易', noMatchesBody: '请清除筛选条件或新增一笔交易。', analytics: '统计分析',
  insightsSubtitle: '在不混合不同币种的前提下了解支出。', from: '开始', to: '结束', multipleCurrencies: '当前包含多种币种。各币种总额和图表分开显示，不假设任何汇率。',
  period: '周期', day: '日', month: '月', year: '年', custom: '自定义', transactionsCount: '笔交易', largest: '最大单笔', average: '平均单笔', noActivityPeriod: '此周期暂无记录',
  byCategory: '按类别', whereMoneyWent: '了解钱花在何处。', whereMoneyCameFrom: '了解收入来自何处。', whereTotalMoved: '按类别查看现金流：收入为正，支出为负。', topMerchants: '主要商户', highestDestinations: '支出最高的商户。', paymentMethods: '支付方式', allocation: '不同卡片和钱包的支出分布。', unmapped: '未指定',
  qualityControl: '质量复核', reviewQueue: '复核队列', reviewSubtitle: '在记录正式归档前确认信息不完整或疑似重复的交易。',
  confirm: '确认', edit: '编辑', deleteDuplicate: '删除重复项', queueClear: '复核队列已清空', queueClearBody: '所有交易均已确认，新的不确定导入会显示在这里。',
  configuration: '配置', settingsSubtitle: '管理采集、分类、隐私和私有数据。', signOut: '退出登录', automation: '自动化',
  categories: '类别', merchantRules: '商户规则', dataBackups: '数据与备份', serverStatus: 'Cloudflare 部署', preferences: '偏好设置',
  language: '语言', followBrowser: '跟随浏览器', english: '英语', simplifiedChinese: '简体中文', traditionalChinese: '繁体中文',
  type: '类型', expense: '支出', refund: '退款', amount: '金额', currency: '币种', merchant: '商户', category: '类别',
  selectCategory: '选择类别', paymentMethod: '支付方式', selectMethod: '选择支付方式', walletCardUnmapped: 'Wallet 识别：{card}（未关联）', dateTime: '日期和时间', purpose: '用途', note: '备注',
  location: '地点', latitude: '纬度', longitude: '经度', excludeAnalytics: '不计入统计', source: '来源', optional: '选填',
  saveTransaction: '保存交易', saving: '正在保存…', delete: '删除', closeEditor: '关闭编辑器', confirmed: '已确认', uncategorized: '未分类', noPayment: '未设置支付方式',
  setupPrivate: '设置你的私人账本', welcomeBack: '欢迎回来', username: '用户名', password: '密码', createAdmin: '创建管理员', signIn: '登录',
  uncategorizedTransactions: '未分类交易', missingDetails: '信息缺失', potentialDuplicates: '疑似重复', lessThanLastMonth: '低于上月', moreThanLastMonth: '高于上月', noPreviousPeriod: '暂无上月对比', monthlyChart: '本月净支出趋势图', monthlyMetricChart: '本月{metric}趋势图', trendEmpty: '产生对应交易后将在这里显示趋势。', spendingTrend: '30 天支出趋势', metricTrend: '30 天{metric}趋势', viewAllTransactions: '查看全部交易', review: '复核', moreInformation: '更多信息', hideInformation: '收起更多信息', firstUseHint: '首次使用：请先创建私有管理员，然后再登录。', showPassword: '显示密码', hidePassword: '隐藏密码', passwordHint: '至少使用 12 个字符，仅保存带盐的密码哈希。',
  loadingTapLedger: '正在加载 TapLedger…', loadingView: '正在加载页面…', privateDatabase: '私人 D1 数据库', baseCurrency: '基础币种', timezone: '时区', selfHostedPrivacy: '自行部署 · 无分析追踪 · 私人数据库', authenticationFailed: '身份验证失败',
  primaryNavigation: '主导航', tapLedgerHome: 'TapLedger 首页', colorTheme: '颜色主题', selectMonth: '选择月份',
  filters: '筛选', transactionFilters: '交易筛选', transactionType: '交易类型', sortTransactions: '交易排序', reviewStatus: '复核状态', minimumAmount: '最低金额', maximumAmount: '最高金额', clearFilters: '清除筛选',
  walletShortcut: 'iPhone 快捷指令', manualPwa: '手动录入', simulator: '模拟器', csvImport: 'CSV 导入', recurring: '定期交易',
  reviewConfirmed: '已确认', reviewNeedsReview: '待复核', reviewMissingInformation: '信息缺失', reviewDuplicateCandidate: '疑似重复',
  merchantExample: '例如：星巴克', sessionExpired: '登录会话需要刷新。', saveFailed: '无法保存交易。', deleteFailed: '无法删除交易。', savedOffline: '已保存在此设备上。云端服务恢复后请确认同步。', deleteTransactionConfirm: '确定删除这笔交易吗？此操作无法撤销。', cloudUnavailable: 'Cloudflare 服务不可用。新的手动交易会保留在此设备上，直到你确认同步。',
  clearSelection: '清除选择', selectAll: '全选', selectedCount: '已选 {count} 笔', categoryForSelected: '所选交易的类别', keepCurrentCategories: '保留当前类别', confirmSelected: '确认所选交易', selectMerchant: '选择 {merchant}', deleteDuplicateConfirm: '确定删除这笔疑似重复交易吗？此操作无法撤销。',
  automationDescription: '供 iPhone 快捷指令使用的私人接口。', importUrl: '导入地址', rotateShortcutToken: '更换快捷指令令牌', sendSimulatedImport: '发送模拟导入', copyTokenNow: '请立即复制此令牌', copy: '复制', activeCategories: '{count} 个启用类别', builtIn: '内置', archive: '归档', newCategory: '新类别', add: '添加',
  paymentMethodsDescription: '导入时可识别的卡片和钱包。', displayName: '显示名称', lastFour: '末四位', classificationRules: '{count} 条分类规则', priority: '优先级', disable: '停用', enable: '启用', merchantContains: '商户名称包含', noCategory: '不指定类别',
  dataBackupsDescription: 'TapLedger 绝不会上传导出的数据。', pendingTransactions: '此设备上有 {count} 笔交易等待同步', confirmSync: '确认同步', exportCsv: '导出 CSV', exportJson: '导出 JSON', creating: '正在创建…', backupNow: '立即备份', noBackups: '暂无备份。', deleteAllFinancialData: '删除所有财务数据', backupBeforeDelete: '系统会先创建并验证备份，管理员和偏好设置将保留。', administratorPassword: '管理员密码', typeDeleteAllData: '输入 DELETE ALL DATA', deleteAllData: '删除所有数据',
  cloudDiagnostics: '此 Cloudflare 部署的实时诊断信息。', service: '服务', database: '数据库', databaseSize: '数据库大小', pendingReviews: '待复核数量', lastImport: '最近导入', lastBackup: '最近备份', versionUptime: '版本 / 运行时间', databaseBinding: '数据库绑定', deploymentUrl: '部署地址：{url}', cloudInfoUnavailable: '无法获取 Cloudflare 部署信息。', checking: '正在检查…', noneYet: '暂无', minutes: '{count} 分钟', healthy: '正常',
  preferencesDescription: '外观和区域显示设置。', nickname: '昵称', nicknameDescription: '用于首页问候，登录用户名保持不变。', saveNickname: '保存昵称', savingNickname: '正在保存…', nicknameUpdated: '昵称已更新。', nicknameUpdateFailed: '无法更新昵称。', rotateTokenConfirm: '确定更换快捷指令令牌吗？更新 iPhone 快捷指令前，当前指令将停止导入。', tokenRotated: '快捷指令令牌已更换。请立即复制，它不会再次显示。', tokenRotationFailed: '快捷指令令牌更换失败。', simulateConfirm: '确定创建一笔带有明确测试标记的模拟交易吗？', simulatedAccepted: '模拟导入已接受：{result}', simulationFailed: '模拟导入失败。',
  archiveCategoryConfirm: '确定归档类别“{name}”吗？', archiveMethodConfirm: '确定归档支付方式“{name}”吗？', updateFailed: '更新失败。', verifiedBackupCreated: '已创建并验证备份：{name}', backupFailed: '备份失败。', deletedAfterBackup: '已在备份 {name} 后删除 {count} 笔交易。', deleteOperationFailed: '删除失败。', syncCompleted: '已向 Cloudflare 同步 {count} 笔离线交易并得到确认。', deleteAllConfirm: '确定在创建备份后永久删除所有财务数据吗？',
  categoryDining: '餐饮', categoryCoffee: '咖啡', categoryGrocery: '杂货', categoryTransport: '交通', categoryShopping: '购物', categoryEntertainment: '娱乐', categoryHousing: '住房', categoryUtilities: '公用事业', categorySubscription: '订阅', categoryTravel: '旅行', categoryHealth: '医疗健康', categoryEducation: '教育', categoryWork: '工作', categoryOther: '其他', categoryUncategorized: '未分类',
  methodCreditCard: '信用卡', methodDebitCard: '借记卡', methodTransitCard: '交通卡', methodCash: '现金', methodDigitalWallet: '电子钱包', methodBankTransfer: '银行转账', methodOther: '其他', matchExact: '完全匹配', matchContains: '包含', matchRegex: '正则表达式',
}

const zhTW: Translation = {
  ...zhCN,
  home: '首頁', settings: '設定', synced: '剛剛已同步', addTransaction: '新增交易', editTransaction: '編輯交易',
  goodMorning: '早安', goodAfternoon: '午安', goodEvening: '晚安', ledgerReady: '你的私人帳本已就緒。', netSpending: '淨支出', netIncome: '淨收入', totalAmount: '總額', chartMetric: '圖表指標', needsReview: '待你複核', openReview: '開啟複核佇列',
  recentTransactions: '最近交易', latestActivity: '來自所有擷取來源的最新記錄。', noTransactions: '暫無交易', noTransactionsBody: '可手動新增，或準備好後連接 iPhone 捷徑。', addFirst: '新增第一筆交易', ledger: '帳本', transactionSubtitle: '搜尋、篩選、編輯並核對每一筆記錄。',
  searchPlaceholder: '搜尋商戶、用途或備註', allTypes: '全部類型', refunds: '退款', transfers: '轉帳', adjustment: '調整', newest: '最新優先', oldest: '最早優先', noMatches: '沒有符合的交易', noMatchesBody: '請清除篩選條件或新增一筆交易。', analytics: '統計分析',
  insightsSubtitle: '在不混合不同幣別的前提下了解支出。', multipleCurrencies: '目前包含多種幣別。各幣別總額和圖表分開顯示，不假設任何匯率。', period: '週期', custom: '自訂', transactionsCount: '筆交易', largest: '最大單筆', average: '平均單筆', noActivityPeriod: '此週期暫無記錄',
  byCategory: '按類別', whereMoneyWent: '了解錢花在何處。', whereMoneyCameFrom: '了解收入來自何處。', whereTotalMoved: '按類別查看現金流：收入為正，支出為負。', topMerchants: '主要商戶', highestDestinations: '支出最高的商戶。', paymentMethods: '付款方式', allocation: '不同卡片和錢包的支出分布。', unmapped: '未指定',
  qualityControl: '品質複核', reviewQueue: '複核佇列', reviewSubtitle: '在記錄正式歸檔前確認資訊不完整或疑似重複的交易。', deleteDuplicate: '刪除重複項', queueClear: '複核佇列已清空', queueClearBody: '所有交易均已確認，新的不確定匯入會顯示在這裡。',
  configuration: '設定', settingsSubtitle: '管理擷取、分類、隱私和私人資料。', signOut: '登出', automation: '自動化', categories: '類別', merchantRules: '商戶規則', dataBackups: '資料與備份', preferences: '偏好設定',
  language: '語言', followBrowser: '跟隨瀏覽器', english: '英文', simplifiedChinese: '簡體中文', traditionalChinese: '繁體中文', type: '類型', merchant: '商戶', category: '類別', selectCategory: '選擇類別', paymentMethod: '付款方式', selectMethod: '選擇付款方式', walletCardUnmapped: 'Wallet 辨識：{card}（未連結）', dateTime: '日期和時間', note: '備註', location: '地點', latitude: '緯度', longitude: '經度', excludeAnalytics: '不計入統計', source: '來源', optional: '選填',
  saveTransaction: '儲存交易', saving: '正在儲存…', delete: '刪除', closeEditor: '關閉編輯器', confirmed: '已確認', uncategorized: '未分類', noPayment: '未設定付款方式', setupPrivate: '設定你的私人帳本', welcomeBack: '歡迎回來', username: '使用者名稱', password: '密碼', createAdmin: '建立管理員', signIn: '登入',
  uncategorizedTransactions: '未分類交易', missingDetails: '資訊缺失', potentialDuplicates: '疑似重複', lessThanLastMonth: '低於上月', moreThanLastMonth: '高於上月', noPreviousPeriod: '暫無上月比較', monthlyChart: '本月淨支出趨勢圖', monthlyMetricChart: '本月{metric}趨勢圖', trendEmpty: '產生對應交易後將在這裡顯示趨勢。', spendingTrend: '30 天支出趨勢', metricTrend: '30 天{metric}趨勢', viewAllTransactions: '查看全部交易', review: '複核', moreInformation: '更多資訊', hideInformation: '收起更多資訊', firstUseHint: '首次使用：請先建立私人管理員，然後再登入。', showPassword: '顯示密碼', hidePassword: '隱藏密碼', passwordHint: '至少使用 12 個字元，僅儲存加鹽密碼雜湊。',
  loadingView: '正在載入頁面…', privateDatabase: '私人 D1 資料庫', baseCurrency: '基礎幣別', timezone: '時區', selfHostedPrivacy: '自行部署 · 無分析追蹤 · 私人資料庫', authenticationFailed: '身分驗證失敗', primaryNavigation: '主導覽', colorTheme: '色彩主題', selectMonth: '選擇月份',
  filters: '篩選', transactionFilters: '交易篩選', transactionType: '交易類型', sortTransactions: '交易排序', reviewStatus: '複核狀態', minimumAmount: '最低金額', maximumAmount: '最高金額', clearFilters: '清除篩選', walletShortcut: 'iPhone 捷徑', manualPwa: '手動輸入', simulator: '模擬器', csvImport: 'CSV 匯入', recurring: '定期交易', reviewNeedsReview: '待複核', reviewMissingInformation: '資訊缺失', reviewDuplicateCandidate: '疑似重複',
  merchantExample: '例如：星巴克', sessionExpired: '登入工作階段需要重新整理。', saveFailed: '無法儲存交易。', deleteFailed: '無法刪除交易。', savedOffline: '已儲存在此裝置上。雲端服務恢復後請確認同步。', deleteTransactionConfirm: '確定刪除這筆交易嗎？此操作無法復原。', cloudUnavailable: 'Cloudflare 服務無法使用。新的手動交易會保留在此裝置上，直到你確認同步。',
  clearSelection: '清除選取', selectAll: '全選', selectedCount: '已選 {count} 筆', categoryForSelected: '所選交易的類別', keepCurrentCategories: '保留目前類別', confirmSelected: '確認所選交易', selectMerchant: '選擇 {merchant}', deleteDuplicateConfirm: '確定刪除這筆疑似重複交易嗎？此操作無法復原。',
  automationDescription: '供 iPhone 捷徑使用的私人端點。', importUrl: '匯入網址', rotateShortcutToken: '更換捷徑權杖', sendSimulatedImport: '傳送模擬匯入', copyTokenNow: '請立即複製此權杖', copy: '複製', activeCategories: '{count} 個啟用類別', builtIn: '內建', archive: '封存', newCategory: '新類別', add: '新增',
  paymentMethodsDescription: '匯入時可辨識的卡片和錢包。', displayName: '顯示名稱', lastFour: '末四碼', classificationRules: '{count} 條分類規則', priority: '優先順序', disable: '停用', enable: '啟用', merchantContains: '商戶名稱包含', noCategory: '不指定類別',
  dataBackupsDescription: 'TapLedger 絕不會上傳匯出的資料。', pendingTransactions: '此裝置上有 {count} 筆交易等待同步', confirmSync: '確認同步', exportCsv: '匯出 CSV', exportJson: '匯出 JSON', creating: '正在建立…', backupNow: '立即備份', noBackups: '暫無備份。', deleteAllFinancialData: '刪除所有財務資料', backupBeforeDelete: '系統會先建立並驗證備份，管理員和偏好設定將保留。', administratorPassword: '管理員密碼', typeDeleteAllData: '輸入 DELETE ALL DATA', deleteAllData: '刪除所有資料',
  cloudDiagnostics: '此 Cloudflare 部署的即時診斷資訊。', service: '服務', database: '資料庫', databaseSize: '資料庫大小', pendingReviews: '待複核數量', lastImport: '最近匯入', lastBackup: '最近備份', versionUptime: '版本 / 執行時間', databaseBinding: '資料庫綁定', deploymentUrl: '部署網址：{url}', cloudInfoUnavailable: '無法取得 Cloudflare 部署資訊。', checking: '正在檢查…', noneYet: '暫無', minutes: '{count} 分鐘', healthy: '正常',
  preferencesDescription: '外觀和地區顯示設定。', nickname: '暱稱', nicknameDescription: '用於首頁問候，登入使用者名稱保持不變。', saveNickname: '儲存暱稱', savingNickname: '正在儲存…', nicknameUpdated: '暱稱已更新。', nicknameUpdateFailed: '無法更新暱稱。', rotateTokenConfirm: '確定更換捷徑權杖嗎？更新 iPhone 捷徑前，目前捷徑將停止匯入。', tokenRotated: '捷徑權杖已更換。請立即複製，它不會再次顯示。', tokenRotationFailed: '捷徑權杖更換失敗。', simulateConfirm: '確定建立一筆帶有明確測試標記的模擬交易嗎？', simulatedAccepted: '模擬匯入已接受：{result}', simulationFailed: '模擬匯入失敗。',
  archiveCategoryConfirm: '確定封存類別「{name}」嗎？', archiveMethodConfirm: '確定封存付款方式「{name}」嗎？', updateFailed: '更新失敗。', verifiedBackupCreated: '已建立並驗證備份：{name}', backupFailed: '備份失敗。', deletedAfterBackup: '已在備份 {name} 後刪除 {count} 筆交易。', deleteOperationFailed: '刪除失敗。', syncCompleted: '已向 Cloudflare 同步 {count} 筆離線交易並得到確認。', deleteAllConfirm: '確定在建立備份後永久刪除所有財務資料嗎？',
  categoryDining: '餐飲', categoryGrocery: '雜貨', categoryShopping: '購物', categoryEntertainment: '娛樂', categoryUtilities: '公用事業', categorySubscription: '訂閱', categoryHealth: '醫療健康', categoryUncategorized: '未分類', methodCreditCard: '信用卡', methodDebitCard: '簽帳金融卡', methodTransitCard: '交通卡', methodDigitalWallet: '電子錢包', methodBankTransfer: '銀行轉帳', matchExact: '完全符合', matchContains: '包含', matchRegex: '正規表示式',
}

const dictionaries = { en, 'zh-CN': zhCN, 'zh-TW': zhTW }
type Values = Record<string, string | number>

const categoryKeys: Record<string, Key> = {
  Dining: 'categoryDining', Coffee: 'categoryCoffee', Grocery: 'categoryGrocery', Transport: 'categoryTransport', Shopping: 'categoryShopping', Entertainment: 'categoryEntertainment', Housing: 'categoryHousing', Utilities: 'categoryUtilities', Subscription: 'categorySubscription', Travel: 'categoryTravel', Health: 'categoryHealth', Education: 'categoryEducation', Work: 'categoryWork', Other: 'categoryOther', Uncategorized: 'categoryUncategorized',
}
const sourceKeys: Record<string, Key> = { wallet_shortcut: 'walletShortcut', manual_pwa: 'manualPwa', simulator: 'simulator', csv_import: 'csvImport', recurring: 'recurring' }
const reviewKeys: Record<string, Key> = { confirmed: 'reviewConfirmed', needs_review: 'reviewNeedsReview', missing_information: 'reviewMissingInformation', duplicate_candidate: 'reviewDuplicateCandidate' }
const typeKeys: Record<string, Key> = { expense: 'expense', income: 'income', refund: 'refund', transfer: 'transfers', adjustment: 'adjustment' }
const methodKeys: Record<string, Key> = { credit_card: 'methodCreditCard', debit_card: 'methodDebitCard', transit_card: 'methodTransitCard', cash: 'methodCash', digital_wallet: 'methodDigitalWallet', bank_transfer: 'methodBankTransfer', other: 'methodOther' }
const matchKeys: Record<string, Key> = { exact: 'matchExact', contains: 'matchContains', regex: 'matchRegex' }

function browserLanguage(): Exclude<Language, 'auto'> {
  const value = navigator.language.toLowerCase()
  if (value.includes('zh-tw') || value.includes('zh-hk') || value.includes('hant')) return 'zh-TW'
  if (value.startsWith('zh')) return 'zh-CN'
  return 'en'
}

interface LocaleContextValue {
  language: Language
  locale: Exclude<Language, 'auto'>
  setLanguage: (value: Language) => void
  t: (key: Key, values?: Values) => string
  categoryLabel: (name: string | null | undefined, isSystem?: boolean) => string
  sourceLabel: (source: string) => string
  reviewStatusLabel: (status: string) => string
  transactionTypeLabel: (type: string) => string
  methodTypeLabel: (type: string) => string
  matchTypeLabel: (type: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: PropsWithChildren) {
  const initial = (localStorage.getItem('tapledger-language') as Language | null) ?? 'auto'
  const [language, setLanguageState] = useState<Language>(['auto', 'en', 'zh-CN', 'zh-TW'].includes(initial) ? initial : 'auto')
  const locale = language === 'auto' ? browserLanguage() : language
  const setLanguage = useCallback((value: Language) => { setLanguageState(value); localStorage.setItem('tapledger-language', value) }, [])
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  const value = useMemo<LocaleContextValue>(() => {
    const translate = (key: Key, values?: Values) => dictionaries[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`))
    const mapped = (map: Record<string, Key>, raw: string) => map[raw] ? translate(map[raw]) : raw.replaceAll('_', ' ')
    return {
      language,
      locale,
      setLanguage,
      t: translate,
      categoryLabel: (name, isSystem = true) => !name ? translate('uncategorized') : isSystem && categoryKeys[name] ? translate(categoryKeys[name]) : name,
      sourceLabel: (source) => mapped(sourceKeys, source),
      reviewStatusLabel: (status) => mapped(reviewKeys, status),
      transactionTypeLabel: (type) => mapped(typeKeys, type),
      methodTypeLabel: (type) => mapped(methodKeys, type),
      matchTypeLabel: (type) => mapped(matchKeys, type),
    }
  }, [language, locale, setLanguage])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
