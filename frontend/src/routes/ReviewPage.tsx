import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleCheck, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '../app/AuthProvider'
import { EmptyState } from '../components/EmptyState'
import { TransactionEditor } from '../components/TransactionEditor'
import { api } from '../lib/api'
import { formatDateTime, formatMoney } from '../lib/format'
import type { Transaction } from '../types/api'
import { useLocale } from '../app/LocaleProvider'

export function ReviewPage() {
  const { csrfToken } = useAuth()
  const { t, locale, categoryLabel, sourceLabel, reviewStatusLabel } = useLocale()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['review'], queryFn: api.review })
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const action = useMutation({
    mutationFn: async ({ ids, remove, categoryId }: { ids: string[]; remove?: boolean; categoryId?: string }) => {
      if (!csrfToken) throw new Error(t('sessionExpired'))
      for (const id of ids) {
        if (remove) await api.deleteReviewDuplicate(id, csrfToken)
        else {
          if (categoryId) await api.updateTransaction(id, { category_id: categoryId }, csrfToken)
          await api.confirmReview(id, csrfToken)
        }
      }
    },
    onSuccess: async () => {
      setSelected(new Set())
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['review'] }), queryClient.invalidateQueries({ queryKey: ['transactions'] }), queryClient.invalidateQueries({ queryKey: ['analytics'] })])
    },
  })
  return (
    <div className="page">
      <header className="page-heading"><div><p className="eyebrow">{t('qualityControl')}</p><h1>{t('reviewQueue')}</h1><p>{t('reviewSubtitle')}</p></div></header>
      {query.data?.length ? <div className="card bulk-review"><button className="text-button" onClick={() => setSelected(selected.size === query.data?.length ? new Set() : new Set(query.data?.map((item) => item.id)))}>{selected.size === query.data.length ? t('clearSelection') : t('selectAll')}</button><span>{t('selectedCount', { count: selected.size })}</span><select aria-label={t('categoryForSelected')} value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}><option value="">{t('keepCurrentCategories')}</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item.name, item.is_system)}</option>)}</select><button className="primary-button" disabled={!selected.size || action.isPending} onClick={() => action.mutate({ ids: [...selected], categoryId: bulkCategory || undefined })}><Check />{t('confirmSelected')}</button></div> : null}
      <section className="review-queue">
        {query.data?.map((item) => <article className="card review-item" key={item.id}><label className="review-select" aria-label={t('selectMerchant', { merchant: item.merchant_normalized })}><input type="checkbox" checked={selected.has(item.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next })} /></label><div className="review-item-main"><span className={`status-pill ${item.review_status}`}>{reviewStatusLabel(item.review_status)}</span><h2>{item.merchant_normalized}</h2><p>{formatDateTime(item.transaction_date, locale)} · {sourceLabel(item.source)}</p><div className="review-facts"><span><small>{t('amount')}</small><strong>{formatMoney(item.amount_minor, item.currency, locale)}</strong></span><span><small>{t('category')}</small><strong>{categoryLabel(item.category_name)}</strong></span><span><small>{t('paymentMethod')}</small><strong>{item.payment_method_name ?? item.card_raw_name ?? '—'}</strong></span></div></div><div className="review-actions"><button className="secondary-button" onClick={() => setEditing(item)}><Edit3 />{t('edit')}</button><button className="primary-button" onClick={() => action.mutate({ ids: [item.id] })}><Check />{t('confirm')}</button>{item.review_status === 'duplicate_candidate' ? <button className="danger-button" onClick={() => window.confirm(t('deleteDuplicateConfirm')) && action.mutate({ ids: [item.id], remove: true })}><Trash2 />{t('deleteDuplicate')}</button> : null}</div></article>)}
        {!query.isLoading && !query.data?.length ? <div className="card"><EmptyState icon={CircleCheck} title={t('queueClear')} body={t('queueClearBody')} /></div> : null}
      </section>
      <TransactionEditor open={Boolean(editing)} transaction={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
