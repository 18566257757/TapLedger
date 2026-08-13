import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Bell, ChevronDown, CircleAlert, CircleHelp, Flag, Plus, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../app/AuthProvider'
import { useLocale } from '../app/LocaleProvider'
import { EmptyState } from '../components/EmptyState'
import { TransactionEditor } from '../components/TransactionEditor'
import { TransactionRow } from '../components/TransactionRow'
import { api } from '../lib/api'
import { formatMoney, monthRange } from '../lib/format'
import type { Transaction } from '../types/api'

function greetingKey() {
  const hour = new Date().getHours()
  if (hour < 12) return 'goodMorning' as const
  if (hour < 18) return 'goodAfternoon' as const
  return 'goodEvening' as const
}

function monthInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 7)
}

function previousMonthRange(date: Date) {
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return monthRange(previous)
}

export function HomePage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(monthInputValue)
  const selectedDate = useMemo(() => new Date(`${selectedMonth}-01T12:00:00`), [selectedMonth])
  const range = useMemo(() => monthRange(selectedDate), [selectedDate, locale])
  const previousRange = useMemo(() => previousMonthRange(selectedDate), [selectedDate, locale])
  const transactions = useQuery({ queryKey: ['transactions', 'home'], queryFn: () => api.transactions('?page_size=5') })
  const reviews = useQuery({ queryKey: ['review'], queryFn: api.review })
  const summary = useQuery({ queryKey: ['analytics', 'summary', range.from, range.to], queryFn: () => api.analyticsSummary(range.from, range.to) })
  const previousSummary = useQuery({ queryKey: ['analytics', 'summary', previousRange.from, previousRange.to], queryFn: () => api.analyticsSummary(previousRange.from, previousRange.to) })
  const trend = useQuery({ queryKey: ['analytics', 'trend', range.from, range.to], queryFn: () => api.trend(range.from, range.to) })

  const primary = summary.data?.currencies[0]
  const chartCurrency = primary?.currency ?? 'HKD'
  const previous = previousSummary.data?.currencies.find((item) => item.currency === chartCurrency)
  const changePercent = primary && previous?.net_spending_minor
    ? Math.round(((primary.net_spending_minor - previous.net_spending_minor) / Math.abs(previous.net_spending_minor)) * 100)
    : null
  const chartData = (trend.data?.items ?? []).filter((item) => item.currency === chartCurrency).map((item) => ({
    date: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T00:00:00`)),
    amount: item.amount_minor / (chartCurrency === 'JPY' ? 1 : 100),
  }))
  const reviewItems = reviews.data ?? []
  const reviewSummary = [
    { label: t('uncategorizedTransactions'), count: reviewItems.filter((item) => item.review_status !== 'duplicate_candidate' && item.review_status !== 'missing_information' && (!item.category_id || item.category_name?.toLowerCase() === 'uncategorized')).length, icon: CircleAlert, tone: 'warning' },
    { label: t('missingDetails'), count: reviewItems.filter((item) => item.review_status === 'missing_information').length, icon: CircleHelp, tone: 'neutral' },
    { label: t('potentialDuplicates'), count: reviewItems.filter((item) => item.review_status === 'duplicate_candidate').length, icon: Flag, tone: 'positive' },
  ]

  const openNewTransaction = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  return (
    <div className="page home-page">
      <header className="mobile-home-header">
        <h1>TapLedger</h1>
        <Link to="/review" className="icon-button mobile-alert-button" aria-label={t('openReview')}><Bell /></Link>
      </header>

      <header className="page-heading home-heading">
        <div><h1>{t(greetingKey())}, {user?.username}</h1><MonthControl label={range.label} value={selectedMonth} onChange={setSelectedMonth} /></div>
      </header>

      <div className="home-overview">
        <section className="spending-overview">
          <div className="card-heading spending-heading">
            <div><span>{t('netSpending')}</span><strong>{primary ? formatMoney(primary.net_spending_minor, primary.currency, locale) : formatMoney(0, 'HKD', locale)}</strong></div>
            <Link className="mobile-chart-link" to="/insights" aria-label={t('insights')}><BarChart3 /></Link>
          </div>
          {changePercent !== null ? <p className={`period-change ${changePercent <= 0 ? 'lower' : 'higher'}`}>{changePercent <= 0 ? <ArrowDown /> : <ArrowUp />}{Math.abs(changePercent)}% {changePercent <= 0 ? t('lessThanLastMonth') : t('moreThanLastMonth')}</p> : <p className="period-change neutral">{t('noPreviousPeriod')}</p>}
          {summary.data?.multiple_currencies ? <p className="currency-note">{t('multipleCurrencies')}</p> : null}
          <div className="chart-frame" aria-label={t('monthlyChart')}>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 16, right: 12, left: -18, bottom: 2 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatMoney(Number(value) * (chartCurrency === 'JPY' ? 1 : 100), chartCurrency, locale)} />
                  <Line type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">{t('trendEmpty')}</div>}
          </div>
          <p className="chart-caption">{t('spendingTrend')}</p>
        </section>

        <aside className="review-rail">
          <div className="review-rail-heading"><span>{t('needsReview')}</span><strong>{reviewItems.length}</strong></div>
          <div className="review-summary-list">
            {reviewSummary.map(({ label, count, icon: Icon, tone }) => <Link to="/review" className="review-summary-row" key={label}><span className={`review-summary-icon ${tone}`}><Icon /></span><span>{label}</span><strong>{count}</strong><ArrowRight /></Link>)}
          </div>
        </aside>

        <Link to="/review" className="mobile-review-banner"><span><CircleAlert />{t('needsReview')} · {reviewItems.length}</span><ArrowRight /></Link>
      </div>

      <section className="recent-section">
        <div className="section-title recent-heading"><div><h2>{t('recentTransactions')}</h2><p>{t('latestActivity')}</p></div><div className="recent-actions"><Link className="text-link" to="/transactions"><span className="desktop-view-all">{t('viewAllTransactions')}</span><span className="mobile-view-all">{t('viewAll')}</span><ArrowRight /></Link><button className="primary-button desktop-add-button" onClick={openNewTransaction}><Plus />{t('addTransaction')}</button></div></div>
        {transactions.data?.items.length ? <>
          <div className="transaction-table-head" aria-hidden="true"><span /><span>{t('merchant')}</span><span>{t('category')}</span><span>{t('paymentMethod')}</span><span>{t('dateTime')}</span><span>{t('review')}</span><span>{t('amount')}</span></div>
          {transactions.data.items.map((item) => <TransactionRow key={item.id} transaction={item} onClick={() => { setEditing(item); setEditorOpen(true) }} />)}
        </> : !transactions.isLoading ? <EmptyState icon={ReceiptText} title={t('noTransactions')} body={t('noTransactionsBody')} action={<button className="secondary-button" onClick={openNewTransaction}>{t('addFirst')}</button>} /> : null}
        <button className="mobile-add-pill" onClick={openNewTransaction}><Plus />{t('addTransaction')}</button>
      </section>
      <TransactionEditor open={editorOpen} transaction={editing} onClose={() => { setEditorOpen(false); setEditing(null) }} />
    </div>
  )
}

function MonthControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="month-control"><span>{label}</span><ChevronDown /><input type="month" aria-label="Select month" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}
