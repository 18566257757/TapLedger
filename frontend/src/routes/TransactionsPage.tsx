import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Filter, Plus, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { TransactionEditor } from '../components/TransactionEditor'
import { TransactionRow } from '../components/TransactionRow'
import { api } from '../lib/api'
import type { Transaction } from '../types/api'
import { useLocale } from '../app/LocaleProvider'

export function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('newest')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [source, setSource] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [currency, setCurrency] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { t } = useLocale()
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const params = useMemo(() => {
    const value = new URLSearchParams({ page_size: '100', sort })
    if (search.trim()) value.set('search', search.trim())
    if (type) value.set('type', type)
    if (categoryId) value.set('category_id', categoryId)
    if (paymentMethodId) value.set('payment_method_id', paymentMethodId)
    if (source) value.set('source', source)
    if (reviewStatus) value.set('review_status', reviewStatus)
    if (currency) value.set('currency', currency)
    if (dateFrom) value.set('date_from', `${dateFrom}T00:00:00`)
    if (dateTo) value.set('date_to', `${dateTo}T23:59:59`)
    if (minAmount) value.set('min_amount_minor', String(Math.round(Number(minAmount) * 100)))
    if (maxAmount) value.set('max_amount_minor', String(Math.round(Number(maxAmount) * 100)))
    return `?${value}`
  }, [search, type, sort, categoryId, paymentMethodId, source, reviewStatus, currency, dateFrom, dateTo, minAmount, maxAmount])
  const query = useQuery({ queryKey: ['transactions', params], queryFn: () => api.transactions(params) })
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: api.paymentMethods })
  const activeFilterCount = [type, categoryId, paymentMethodId, source, reviewStatus, currency, dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length
  const clearFilters = () => {
    setType(''); setCategoryId(''); setPaymentMethodId(''); setSource(''); setReviewStatus(''); setCurrency(''); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setSort('newest')
  }

  return (
    <div className="page">
      <header className="page-heading"><div><p className="eyebrow">{t('ledger')}</p><h1>{t('transactions')}</h1><p>{t('transactionSubtitle')}</p></div><button className="primary-button" onClick={() => { setEditing(null); setEditorOpen(true) }}><Plus />{t('addTransaction')}</button></header>
      <button className="mobile-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}><span><SlidersHorizontal />Filters{activeFilterCount ? <b>{activeFilterCount}</b> : null}</span><ChevronDown className={filtersOpen ? 'rotated' : ''} /></button>
      <section className={`filter-bar card${filtersOpen ? ' filters-open' : ''}`} aria-label="Transaction filters">
        <label className="search-control"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
        <label className="select-control"><Filter /><select aria-label="Transaction type" value={type} onChange={(event) => setType(event.target.value)}><option value="">{t('allTypes')}</option><option value="expense">{t('expenses')}</option><option value="income">{t('income')}</option><option value="refund">{t('refunds')}</option><option value="transfer">{t('transfers')}</option></select></label>
        <select aria-label="Sort transactions" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{t('newest')}</option><option value="oldest">{t('oldest')}</option><option value="amount_high">{t('highest')}</option><option value="amount_low">{t('lowest')}</option></select>
        <select aria-label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">{t('categories')}</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Payment method" value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">{t('paymentMethods')}</option>{methods.data?.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>
        <select aria-label="Source" value={source} onChange={(event) => setSource(event.target.value)}><option value="">{t('source')}</option><option value="wallet_shortcut">Wallet Shortcut</option><option value="manual_pwa">Manual PWA</option><option value="simulator">Simulator</option><option value="csv_import">CSV</option></select>
        <select aria-label="Review status" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}><option value="">{t('needsReview')}</option><option value="confirmed">Confirmed</option><option value="needs_review">Needs review</option><option value="missing_information">Missing information</option><option value="duplicate_candidate">Duplicate candidate</option></select>
        <select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="">{t('currency')}</option>{['HKD', 'CNY', 'USD', 'CAD', 'JPY', 'EUR', 'GBP'].map((item) => <option key={item}>{item}</option>)}</select>
        <label className="date-filter">{t('from')}<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="date-filter">{t('to')}<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <label className="date-filter">Minimum amount<input type="number" min="0" step="0.01" inputMode="decimal" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} /></label>
        <label className="date-filter">Maximum amount<input type="number" min="0" step="0.01" inputMode="decimal" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></label>
        {activeFilterCount ? <button className="clear-filters" type="button" onClick={clearFilters}><X />Clear filters</button> : null}
      </section>
      <section className="card transaction-list-card">
        <div className="section-title"><div><h2>{t('allActivity')}</h2><p>{query.data ? `${query.data.total} ${t('transactions')}` : '...'}</p></div></div>
        {query.data?.items.length ? query.data.items.map((item) => <TransactionRow key={item.id} transaction={item} onClick={() => { setEditing(item); setEditorOpen(true) }} />) : !query.isLoading ? <EmptyState icon={ReceiptText} title={t('noMatches')} body={t('noMatchesBody')} /> : null}
      </section>
      <TransactionEditor open={editorOpen} transaction={editing} onClose={() => { setEditorOpen(false); setEditing(null) }} />
      <button className="mobile-fab" onClick={() => { setEditing(null); setEditorOpen(true) }} aria-label={t('addTransaction')}><Plus /></button>
    </div>
  )
}
