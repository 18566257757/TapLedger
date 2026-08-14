import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { api } from '../lib/api'
import { analyticsMetricValue } from '../lib/analytics'
import { formatMoney, monthRange } from '../lib/format'
import { useLocale } from '../app/LocaleProvider'
import { ChartMetricSwitch } from '../components/ChartMetricSwitch'
import type { AnalyticsMetric, CurrencySummary } from '../types/api'

const palette = ['#635bff', '#20a17f', '#f7a850', '#e06c75', '#6087d8', '#9a72c7']
type Period = 'day' | 'month' | 'year' | 'custom'

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function compactChartLabel(label: string) {
  return label.length > 15 ? `${label.slice(0, 14)}…` : label
}

export function InsightsPage() {
  const { t, locale, categoryLabel } = useLocale()
  const current = useMemo(() => monthRange(), [])
  const [from, setFrom] = useState(current.from.slice(0, 10))
  const [to, setTo] = useState(dateInputValue(new Date()))
  const [period, setPeriod] = useState<Period>('month')
  const [categoryMetric, setCategoryMetric] = useState<AnalyticsMetric>('net_spending')

  const selectPeriod = (value: Period) => {
    setPeriod(value)
    if (value === 'custom') return
    const today = new Date()
    const start = new Date(today)
    if (value === 'month') start.setDate(1)
    if (value === 'year') start.setMonth(0, 1)
    setFrom(dateInputValue(start))
    setTo(dateInputValue(today))
  }
  const fromIso = `${from}T00:00:00.000Z`
  const toIso = `${to}T23:59:59.999Z`
  const results = useQueries({ queries: [
    { queryKey: ['analytics', 'summary', fromIso, toIso], queryFn: () => api.analyticsSummary(fromIso, toIso) },
    { queryKey: ['analytics', 'categories', fromIso, toIso], queryFn: () => api.breakdown('categories', fromIso, toIso) },
    { queryKey: ['analytics', 'merchants', fromIso, toIso], queryFn: () => api.breakdown('merchants', fromIso, toIso) },
    { queryKey: ['analytics', 'payment-methods', fromIso, toIso], queryFn: () => api.breakdown('payment-methods', fromIso, toIso) },
  ] })
  const [summary, categories, merchants, paymentMethods] = results
  const currency = summary.data?.currencies[0]?.currency ?? 'HKD'
  const categoryData = useMemo(() => (categories.data?.items ?? [])
    .filter((item) => item.currency === currency)
    .map((item) => {
      const signedValue = analyticsMetricValue(item, categoryMetric)
      return { name: categoryLabel(item.label), value: Math.abs(signedValue), signedValue }
    })
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 6), [categories.data?.items, categoryLabel, categoryMetric, currency])
  const merchantData = (merchants.data?.items ?? []).filter((item) => item.currency === currency).slice(0, 8).map((item) => ({ name: item.label, displayName: compactChartLabel(item.label), value: item.amount_minor }))
  const methodData = (paymentMethods.data?.items ?? []).filter((item) => item.currency === currency).slice(0, 6).map((item) => ({ ...item, label: item.label === 'Unmapped' ? t('unmapped') : item.label }))
  const categoryDescription = categoryMetric === 'net_income' ? t('whereMoneyCameFrom') : categoryMetric === 'total' ? t('whereTotalMoved') : t('whereMoneyWent')
  const summaryMetricLabel = categoryMetric === 'net_income' ? t('netIncome') : categoryMetric === 'total' ? t('totalAmount') : t('netSpending')

  return (
    <div className="page">
      <header className="page-heading insights-heading"><div><p className="eyebrow">{t('analytics')}</p><h1>{t('insights')}</h1><p>{t('insightsSubtitle')}</p></div><div className="date-range"><label className="period-field">{t('period')}<select value={period} onChange={(event) => selectPeriod(event.target.value as Period)}><option value="day">{t('day')}</option><option value="month">{t('month')}</option><option value="year">{t('year')}</option><option value="custom">{t('custom')}</option></select></label><label>{t('from')}<input type="date" value={from} onChange={(event) => { setPeriod('custom'); setFrom(event.target.value) }} /></label><label>{t('to')}<input type="date" value={to} onChange={(event) => { setPeriod('custom'); setTo(event.target.value) }} /></label></div></header>
      {summary.data?.multiple_currencies ? <div className="info-banner">{t('multipleCurrencies')}</div> : null}
      <div className="metric-grid">
        {(summary.data?.currencies ?? []).map((item) => {
          const stats = currencyMetricStats(item, categoryMetric)
          return <article className="card metric-card" key={item.currency}><span>{item.currency} {summaryMetricLabel}</span><strong>{formatMoney(stats.value, item.currency, locale)}</strong><small>{stats.count} {t('transactionsCount')} · {t('largest')} {formatMoney(stats.largest, item.currency, locale)} · {t('average')} {formatMoney(stats.average, item.currency, locale)}</small></article>
        })}
        {!summary.data?.currencies.length ? <article className="card metric-card"><span>{summaryMetricLabel}</span><strong>{formatMoney(0, currency, locale)}</strong><small>{t('noActivityPeriod')}</small></article> : null}
      </div>
      <div className="insights-grid">
        <section className="card insight-card"><div className="section-title metric-section-title"><div><h2>{t('byCategory')}</h2><p>{categoryDescription}</p></div><ChartMetricSwitch value={categoryMetric} onChange={setCategoryMetric} /></div>{categoryData.length ? <div className="insight-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={98} paddingAngle={3} isAnimationActive={false}>{categoryData.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Pie><Tooltip cursor={false} content={(props) => <MoneyTooltip {...props} currency={currency} locale={locale} />} /></PieChart></ResponsiveContainer></div> : <ChartEmpty />}</section>
        <section className="card insight-card"><div className="section-title"><div><h2>{t('topMerchants')}</h2><p>{t('highestDestinations')}</p></div></div>{merchantData.length ? <div className="insight-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={merchantData} layout="vertical" margin={{ left: 18 }}><CartesianGrid horizontal={false} stroke="var(--line)" /><XAxis type="number" hide /><YAxis type="category" dataKey="displayName" width={100} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip cursor={false} content={(props) => <MoneyTooltip {...props} currency={currency} locale={locale} />} /><Bar dataKey="value" fill="var(--accent)" radius={[0, 8, 8, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <ChartEmpty />}</section>
      </div>
      <section className="card breakdown-card"><div className="section-title"><div><h2>{t('paymentMethods')}</h2><p>{t('allocation')}</p></div></div>{methodData.length ? methodData.map((item, index) => <div className="breakdown-row" key={`${item.currency}-${item.label}`}><span><i style={{ background: palette[index % palette.length] }} />{item.label}</span><strong>{formatMoney(item.amount_minor, item.currency, locale)}</strong></div>) : <ChartEmpty />}</section>
    </div>
  )
}

function currencyMetricStats(item: CurrencySummary, metric: AnalyticsMetric) {
  const value = analyticsMetricValue(item, metric)
  const count = metric === 'net_income' ? item.net_income_transaction_count : metric === 'total' ? item.total_transaction_count : item.transaction_count
  const largest = metric === 'net_income' ? item.largest_income_minor : metric === 'total' ? item.largest_total_minor : item.largest_minor
  return { value, count, largest, average: count ? Math.round(value / count) : 0 }
}

function MoneyTooltip({ active, payload, label, currency, locale }: TooltipContentProps & { currency: string; locale: string }) {
  const item = payload?.[0]
  if (!active || !item || item.value === undefined) return null
  const itemLabel = String(item.payload?.name ?? item.name ?? label ?? '')
  const displayValue = typeof item.payload?.signedValue === 'number' ? item.payload.signedValue : Number(item.value)
  return <div className="chart-tooltip"><span><i style={{ background: item.color ?? 'var(--accent)' }} /><b>{itemLabel}</b></span><strong>{formatMoney(displayValue, currency, locale)}</strong></div>
}

function ChartEmpty() {
  const { t } = useLocale()
  return <div className="chart-empty compact"><BarChart3 />{t('noTransactionsBody')}</div>
}
