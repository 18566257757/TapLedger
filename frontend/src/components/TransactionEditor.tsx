import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Ban, CalendarDays, ChevronDown, FileText, MapPin, Radio, Store, Tags, Trash2, WalletCards, X } from 'lucide-react'
import { useAuth } from '../app/AuthProvider'
import { useLocale } from '../app/LocaleProvider'
import { api } from '../lib/api'
import { enqueueTransaction } from '../lib/pendingQueue'
import type { Transaction, TransactionType } from '../types/api'

interface TransactionEditorProps {
  open: boolean
  transaction?: Transaction | null
  onClose: () => void
}

function localDateTimeValue(value?: string): string {
  const date = value ? new Date(value) : new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const currencySymbols: Record<string, string> = { HKD: 'HK$', CNY: 'CN¥', USD: 'US$', CAD: 'CA$', JPY: '¥', EUR: '€', GBP: '£' }

export function TransactionEditor({ open, transaction, onClose }: TransactionEditorProps) {
  const queryClient = useQueryClient()
  const { csrfToken } = useAuth()
  const { t, categoryLabel, sourceLabel, transactionTypeLabel } = useLocale()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('HKD')
  const [merchant, setMerchant] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [transactionDate, setTransactionDate] = useState(localDateTimeValue())
  const [purpose, setPurpose] = useState('')
  const [note, setNote] = useState('')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [excluded, setExcluded] = useState(false)
  const [message, setMessage] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const amountInput = useRef<HTMLInputElement>(null)

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: open })
  const paymentMethods = useQuery({ queryKey: ['payment-methods'], queryFn: api.paymentMethods, enabled: open })

  useEffect(() => {
    if (!open) return
    setType(transaction?.type ?? 'expense')
    setAmount(transaction?.amount ?? '')
    setCurrency(transaction?.currency ?? 'HKD')
    setMerchant(transaction?.merchant_raw ?? '')
    setCategoryId(transaction?.category_id ?? '')
    setPaymentMethodId(transaction?.payment_method_id ?? '')
    setTransactionDate(localDateTimeValue(transaction?.transaction_date))
    setPurpose(transaction?.purpose ?? '')
    setNote(transaction?.note ?? '')
    setLocationName(transaction?.location_name ?? '')
    setLatitude(transaction?.latitude ?? '')
    setLongitude(transaction?.longitude ?? '')
    setExcluded(transaction?.is_excluded_from_analytics ?? false)
    setMessage('')
    setDetailsOpen(Boolean(transaction?.location_name || transaction?.latitude || transaction?.longitude || transaction?.is_excluded_from_analytics || (transaction && !['expense', 'income'].includes(transaction.type))))
  }, [open, transaction])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    window.setTimeout(() => amountInput.current?.focus(), 120)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!csrfToken) throw new Error(t('sessionExpired'))
      const payload = {
        type,
        amount,
        currency,
        merchant,
        category_id: categoryId || null,
        payment_method_id: paymentMethodId || null,
        transaction_date: new Date(transactionDate).toISOString(),
        purpose: purpose || null,
        note: note || null,
        location_name: locationName || null,
        latitude: latitude || null,
        longitude: longitude || null,
        is_excluded_from_analytics: excluded,
      }
      if (transaction) return api.updateTransaction(transaction.id, payload, csrfToken)
      return api.createTransaction(payload, csrfToken)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['review'] }),
      ])
      onClose()
    },
    onError: () => setMessage(t('saveFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!transaction || !csrfToken) throw new Error(t('sessionExpired'))
      await api.deleteTransaction(transaction.id, csrfToken)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['analytics'] })
      await queryClient.invalidateQueries({ queryKey: ['review'] })
      onClose()
    },
    onError: () => setMessage(t('deleteFailed')),
  })

  if (!open) return null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!navigator.onLine && !transaction) {
      enqueueTransaction({ type, amount, currency, merchant, category_id: categoryId || null, payment_method_id: paymentMethodId || null, transaction_date: new Date(transactionDate).toISOString(), purpose: purpose || null, note: note || null, location_name: locationName || null, latitude: latitude || null, longitude: longitude || null, is_excluded_from_analytics: excluded })
      setMessage(t('savedOffline'))
      return
    }
    mutation.mutate()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="transaction-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <span className="sheet-grabber" aria-hidden="true" />
        <header className="editor-header"><h2 id="editor-title">{transaction ? t('editTransaction') : t('addTransaction')}</h2><button className="icon-button" onClick={onClose} aria-label={t('closeEditor')}><X /></button></header>
        <form onSubmit={submit} className="editor-form">
          <div className="field-row type-field" role="group" aria-label={t('type')}><ArrowLeftRight /><span>{t('type')}</span><div className="type-picker desktop-type-picker">{(['expense', 'income', 'refund', 'transfer', 'adjustment'] as const).map((item) => <button type="button" key={item} className={type === item ? 'selected' : ''} onClick={() => setType(item)}>{transactionTypeLabel(item)}</button>)}</div><div className="type-picker mobile-primary-type-picker">{(['expense', 'income'] as const).map((item) => <button type="button" key={item} className={type === item ? 'selected' : ''} onClick={() => setType(item)}>{transactionTypeLabel(item)}</button>)}</div></div>
          <label className="field-row"><WalletCards /><span>{t('amount')}</span><span className="amount-control"><small>{currencySymbols[currency] ?? currency}</small><input ref={amountInput} required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></span></label>
          <label className="field-row"><ArrowLeftRight /><span>{t('currency')}</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}>{['HKD', 'CNY', 'USD', 'CAD', 'JPY', 'EUR', 'GBP'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field-row"><Store /><span>{t('merchant')}</span><input required value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder={t('merchantExample')} /></label>
          <label className="field-row"><Tags /><span>{t('category')}</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">{t('selectCategory')}</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item.name, item.is_system)}</option>)}</select></label>
          <label className="field-row"><WalletCards /><span>{t('paymentMethod')}</span><select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">{transaction?.card_raw_name ? t('walletCardUnmapped', { card: transaction.card_raw_name }) : t('selectMethod')}</option>{paymentMethods.data?.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
          <label className="field-row"><CalendarDays /><span>{t('dateTime')}</span><input required type="datetime-local" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label>
          <label className="field-row"><Tags /><span>{t('purpose')}</span><input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder={t('optional')} /></label>
          <label className="field-row note-row"><FileText /><span>{t('note')}</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('optional')} /></label>
          <button className="details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}><span>{detailsOpen ? t('hideInformation') : t('moreInformation')}</span><ChevronDown className={detailsOpen ? 'rotated' : ''} /></button>
          {detailsOpen ? <div className="editor-details">
            <label className="field-row mobile-extra-type"><ArrowLeftRight /><span>{t('type')}</span><select value={type} onChange={(event) => setType(event.target.value as TransactionType)}>{(['expense', 'income', 'refund', 'transfer', 'adjustment'] as const).map((item) => <option key={item} value={item}>{transactionTypeLabel(item)}</option>)}</select></label>
            <label className="field-row"><MapPin /><span>{t('location')}</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder={t('optional')} /></label>
            <div className="coordinate-grid"><label><span>{t('latitude')}</span><input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="22.3193" /></label><label><span>{t('longitude')}</span><input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="114.1694" /></label></div>
            <label className="toggle-row"><Ban /><span>{t('excludeAnalytics')}</span><input type="checkbox" checked={excluded} onChange={(event) => setExcluded(event.target.checked)} /></label>
            <div className="source-row"><Radio /><span>{t('source')}</span><strong>{sourceLabel(transaction?.source ?? 'manual_pwa')}</strong></div>
          </div> : null}
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <div className="editor-actions">
            {transaction ? <button type="button" className="danger-button" disabled={deleteMutation.isPending} onClick={() => window.confirm(t('deleteTransactionConfirm')) && deleteMutation.mutate()}><Trash2 />{t('delete')}</button> : null}
            <button className="primary-button save-button" disabled={mutation.isPending}>{mutation.isPending ? t('saving') : t('saveTransaction')}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
