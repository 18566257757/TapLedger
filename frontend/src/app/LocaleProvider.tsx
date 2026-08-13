import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type Language = 'auto' | 'en' | 'zh-CN' | 'zh-TW'

const en = {
  home: 'Home', transactions: 'Transactions', insights: 'Insights', settings: 'Settings', synced: 'Synced just now',
  lightMode: 'Use light mode', darkMode: 'Use dark mode', addTransaction: 'Add transaction', editTransaction: 'Edit transaction',
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening', ledgerReady: 'Your private ledger is ready.',
  netSpending: 'Net spending', thisMonth: 'This month', needsReview: 'Needs your review', openReview: 'Open review queue',
  recentTransactions: 'Recent transactions', latestActivity: 'The latest activity from every capture source.', viewAll: 'View all',
  noTransactions: 'No transactions yet', noTransactionsBody: 'Add one manually or connect the iPhone Shortcut when you are ready.',
  addFirst: 'Add your first transaction', ledger: 'Ledger', transactionSubtitle: 'Search, filter, edit, and verify every entry.',
  searchPlaceholder: 'Search merchant, purpose, or note', allTypes: 'All types', expenses: 'Expenses', income: 'Income', refunds: 'Refunds', transfers: 'Transfers',
  newest: 'Newest first', oldest: 'Oldest first', highest: 'Highest amount', lowest: 'Lowest amount', allActivity: 'All activity',
  noMatches: 'No matching transactions', noMatchesBody: 'Try clearing the filters or add a new transaction.', analytics: 'Analytics',
  insightsSubtitle: 'Understand your spending without combining unlike currencies.', from: 'From', to: 'To', multipleCurrencies: 'Multiple currencies are present. Each total and chart is separated by currency; no exchange rate is assumed.',
  period: 'Period', day: 'Day', month: 'Month', year: 'Year', custom: 'Custom', transactionsCount: 'transactions', largest: 'largest', average: 'average', noActivityPeriod: 'No activity in this period',
  byCategory: 'By category', whereMoneyWent: 'Where your money went.', topMerchants: 'Top merchants', highestDestinations: 'Your highest spend destinations.', paymentMethods: 'Payment methods', allocation: 'Spend allocation across cards and wallets.',
  qualityControl: 'Quality control', reviewQueue: 'Review queue', reviewSubtitle: 'Confirm incomplete or possible duplicate entries before they settle into your ledger.',
  confirm: 'Confirm', edit: 'Edit', deleteDuplicate: 'Delete duplicate', queueClear: 'Review queue is clear', queueClearBody: 'Every transaction is confirmed. New uncertain imports will appear here.',
  configuration: 'Configuration', settingsSubtitle: 'Manage capture, classification, privacy, and local data.', signOut: 'Sign out', automation: 'Automation',
  categories: 'Categories', merchantRules: 'Merchant rules', dataBackups: 'Data & backups', serverStatus: 'Server status', preferences: 'Preferences',
  language: 'Language', followBrowser: 'Follow browser', english: 'English', simplifiedChinese: '简体中文', traditionalChinese: '繁體中文',
  type: 'Type', expense: 'Expense', refund: 'Refund', amount: 'Amount', currency: 'Currency', merchant: 'Merchant', category: 'Category',
  selectCategory: 'Select category', paymentMethod: 'Payment method', selectMethod: 'Select method', dateTime: 'Date & time', purpose: 'Purpose', note: 'Note',
  location: 'Location', latitude: 'Latitude', longitude: 'Longitude', excludeAnalytics: 'Exclude from analytics', source: 'Source', optional: 'Optional',
  saveTransaction: 'Save transaction', saving: 'Saving...', delete: 'Delete', closeEditor: 'Close editor', confirmed: 'Confirmed', uncategorized: 'Uncategorized', noPayment: 'No payment method',
  setupPrivate: 'Set up your private ledger', welcomeBack: 'Welcome back', username: 'Username', password: 'Password', createAdmin: 'Create administrator', signIn: 'Sign in',
  uncategorizedTransactions: 'Uncategorised transactions', missingDetails: 'Missing details', potentialDuplicates: 'Potential duplicates', lessThanLastMonth: 'less than last month', moreThanLastMonth: 'more than last month', noPreviousPeriod: 'No previous-month comparison yet', monthlyChart: 'Monthly net spending chart', trendEmpty: 'Your spending trend will appear here.', spendingTrend: '30-day spending trend', viewAllTransactions: 'View all transactions', review: 'Review', moreInformation: 'More information', hideInformation: 'Hide information', firstUseHint: 'First use: create your local administrator before signing in.', showPassword: 'Show password', hidePassword: 'Hide password', passwordHint: 'Use at least 12 characters. This password stays on this computer.',
} as const

type Translation = { [K in keyof typeof en]: string }

const zhCN: Translation = {
  home: '首页', transactions: '交易', insights: '分析', settings: '设置', synced: '刚刚已同步', lightMode: '使用浅色模式', darkMode: '使用深色模式',
  addTransaction: '新增交易', editTransaction: '编辑交易', goodMorning: '早上好', goodAfternoon: '下午好', goodEvening: '晚上好', ledgerReady: '你的私人账本已就绪。',
  netSpending: '净支出', thisMonth: '本月', needsReview: '待你复核', openReview: '打开复核队列', recentTransactions: '最近交易', latestActivity: '来自所有采集来源的最新记录。', viewAll: '查看全部',
  noTransactions: '暂无交易', noTransactionsBody: '可手动新增，或准备好后连接 iPhone 快捷指令。', addFirst: '新增第一笔交易', ledger: '账本', transactionSubtitle: '搜索、筛选、编辑并核对每一笔记录。',
  searchPlaceholder: '搜索商户、用途或备注', allTypes: '全部类型', expenses: '支出', income: '收入', refunds: '退款', transfers: '转账', newest: '最新优先', oldest: '最早优先', highest: '金额从高到低', lowest: '金额从低到高',
  allActivity: '全部记录', noMatches: '没有匹配的交易', noMatchesBody: '请清除筛选条件或新增一笔交易。', analytics: '统计分析', insightsSubtitle: '在不混合不同币种的前提下了解支出。', from: '开始', to: '结束',
  period: '周期', day: '日', month: '月', year: '年', custom: '自定义', transactionsCount: '笔交易', largest: '最大单笔', average: '平均单笔', noActivityPeriod: '此周期暂无记录',
  multipleCurrencies: '当前包含多种币种。各币种总额和图表分开显示，不假设任何汇率。', byCategory: '按类别', whereMoneyWent: '了解钱花在何处。', topMerchants: '主要商户', highestDestinations: '支出最高的商户。', paymentMethods: '支付方式', allocation: '不同卡片和钱包的支出分布。',
  qualityControl: '质量复核', reviewQueue: '复核队列', reviewSubtitle: '在记录正式归档前确认信息不完整或疑似重复的交易。', confirm: '确认', edit: '编辑', deleteDuplicate: '删除重复项', queueClear: '复核队列已清空', queueClearBody: '所有交易均已确认，新的不确定导入会显示在这里。',
  configuration: '配置', settingsSubtitle: '管理采集、分类、隐私和本地数据。', signOut: '退出登录', automation: '自动化', categories: '类别', merchantRules: '商户规则', dataBackups: '数据与备份', serverStatus: '服务器状态', preferences: '偏好设置',
  language: '语言', followBrowser: '跟随浏览器', english: 'English', simplifiedChinese: '简体中文', traditionalChinese: '繁體中文', type: '类型', expense: '支出', refund: '退款', amount: '金额', currency: '币种', merchant: '商户', category: '类别',
  selectCategory: '选择类别', paymentMethod: '支付方式', selectMethod: '选择支付方式', dateTime: '日期和时间', purpose: '用途', note: '备注', location: '地点', latitude: '纬度', longitude: '经度', excludeAnalytics: '不计入统计', source: '来源', optional: '选填',
  saveTransaction: '保存交易', saving: '正在保存…', delete: '删除', closeEditor: '关闭编辑器', confirmed: '已确认', uncategorized: '未分类', noPayment: '未设置支付方式',
  setupPrivate: '设置你的私人账本', welcomeBack: '欢迎回来', username: '用户名', password: '密码', createAdmin: '创建管理员', signIn: '登录',
  uncategorizedTransactions: '未分类交易', missingDetails: '信息缺失', potentialDuplicates: '疑似重复', lessThanLastMonth: '低于上月', moreThanLastMonth: '高于上月', noPreviousPeriod: '暂无上月对比', monthlyChart: '本月净支出趋势图', trendEmpty: '产生交易后将在这里显示趋势。', spendingTrend: '30 天支出趋势', viewAllTransactions: '查看全部交易', review: '复核', moreInformation: '更多信息', hideInformation: '收起更多信息', firstUseHint: '首次使用：请先创建本机管理员，然后再登录。', showPassword: '显示密码', hidePassword: '隐藏密码', passwordHint: '至少使用 12 个字符，密码只保存在这台电脑上。',
}

const zhTW: Translation = {
  ...zhCN,
  home: '首頁', transactions: '交易', insights: '分析', settings: '設定', synced: '剛剛已同步', lightMode: '使用淺色模式', darkMode: '使用深色模式', addTransaction: '新增交易', editTransaction: '編輯交易',
  goodMorning: '早安', goodAfternoon: '午安', goodEvening: '晚安', ledgerReady: '你的私人帳本已就緒。', netSpending: '淨支出', thisMonth: '本月', needsReview: '待你複核', openReview: '開啟複核佇列',
  recentTransactions: '最近交易', latestActivity: '來自所有擷取來源的最新記錄。', viewAll: '查看全部', noTransactions: '暫無交易', noTransactionsBody: '可手動新增，或準備好後連接 iPhone 捷徑。',
  transactionSubtitle: '搜尋、篩選、編輯並核對每一筆記錄。', searchPlaceholder: '搜尋商戶、用途或備註', allTypes: '全部類型', expenses: '支出', refunds: '退款', transfers: '轉帳', newest: '最新優先', oldest: '最早優先',
  noMatches: '沒有符合的交易', noMatchesBody: '請清除篩選條件或新增一筆交易。', insightsSubtitle: '在不混合不同幣別的前提下了解支出。', multipleCurrencies: '目前包含多種幣別。各幣別總額和圖表分開顯示，不假設任何匯率。',
  period: '週期', day: '日', month: '月', year: '年', custom: '自訂', transactionsCount: '筆交易', largest: '最大單筆', average: '平均單筆', noActivityPeriod: '此週期暫無記錄',
  qualityControl: '品質複核', reviewQueue: '複核佇列', reviewSubtitle: '在記錄正式歸檔前確認資訊不完整或疑似重複的交易。', deleteDuplicate: '刪除重複項', queueClear: '複核佇列已清空', queueClearBody: '所有交易均已確認，新的不確定匯入會顯示在這裡。',
  configuration: '設定', settingsSubtitle: '管理擷取、分類、隱私和本機資料。', signOut: '登出', automation: '自動化', categories: '類別', merchantRules: '商戶規則', dataBackups: '資料與備份', serverStatus: '伺服器狀態', preferences: '偏好設定',
  language: '語言', followBrowser: '跟隨瀏覽器', type: '類型', amount: '金額', currency: '幣別', merchant: '商戶', category: '類別', selectCategory: '選擇類別', paymentMethod: '付款方式', selectMethod: '選擇付款方式', dateTime: '日期與時間', purpose: '用途', note: '備註', location: '地點', latitude: '緯度', longitude: '經度', excludeAnalytics: '不計入統計', source: '來源', optional: '選填',
  saveTransaction: '儲存交易', saving: '正在儲存…', delete: '刪除', closeEditor: '關閉編輯器', confirmed: '已確認', uncategorized: '未分類', noPayment: '未設定付款方式',
  setupPrivate: '設定你的私人帳本', welcomeBack: '歡迎回來', username: '使用者名稱', password: '密碼', createAdmin: '建立管理員', signIn: '登入',
  uncategorizedTransactions: '未分類交易', missingDetails: '資訊缺失', potentialDuplicates: '疑似重複', lessThanLastMonth: '低於上月', moreThanLastMonth: '高於上月', noPreviousPeriod: '暫無上月比較', monthlyChart: '本月淨支出趨勢圖', trendEmpty: '產生交易後將在此顯示趨勢。', spendingTrend: '30 天支出趨勢', viewAllTransactions: '查看全部交易', review: '複核', moreInformation: '更多資訊', hideInformation: '收起更多資訊', firstUseHint: '首次使用：請先建立本機管理員，然後再登入。', showPassword: '顯示密碼', hidePassword: '隱藏密碼', passwordHint: '至少使用 12 個字元，密碼只保存在這台電腦上。',
}

type Key = keyof typeof en
const dictionaries = { en, 'zh-CN': zhCN, 'zh-TW': zhTW }

function browserLanguage(): Exclude<Language, 'auto'> {
  const value = navigator.language.toLowerCase()
  if (value.includes('zh-tw') || value.includes('zh-hk') || value.includes('hant')) return 'zh-TW'
  if (value.startsWith('zh')) return 'zh-CN'
  return 'en'
}

interface LocaleContextValue { language: Language; locale: Exclude<Language, 'auto'>; setLanguage: (value: Language) => void; t: (key: Key) => string }
const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: PropsWithChildren) {
  const initial = (localStorage.getItem('tapledger-language') as Language | null) ?? 'auto'
  const [language, setLanguageState] = useState<Language>(['auto', 'en', 'zh-CN', 'zh-TW'].includes(initial) ? initial : 'auto')
  const locale = language === 'auto' ? browserLanguage() : language
  const setLanguage = useCallback((value: Language) => { setLanguageState(value); localStorage.setItem('tapledger-language', value) }, [])
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  const value = useMemo(() => ({ language, locale, setLanguage, t: (key: Key) => dictionaries[locale][key] }), [language, locale, setLanguage])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
