import { CircleAlert, CircleCheck, Coffee, HelpCircle, ShoppingBasket, TrainFront } from 'lucide-react'
import type { Transaction } from '../types/api'
import { formatDateTime, formatMoney } from '../lib/format'
import { useLocale } from '../app/LocaleProvider'

const categoryIcons = {
  Coffee,
  Grocery: ShoppingBasket,
  Transport: TrainFront,
}

export function TransactionRow({ transaction, onClick }: { transaction: Transaction; onClick?: () => void }) {
  const { t } = useLocale()
  const Icon = categoryIcons[transaction.category_name as keyof typeof categoryIcons] ?? HelpCircle
  const statusLabel = transaction.review_status === 'confirmed' ? t('confirmed') : t('needsReview')
  const StatusIcon = transaction.review_status === 'confirmed' ? CircleCheck : CircleAlert
  const sign = transaction.type === 'expense' ? '-' : transaction.type === 'refund' ? '+' : ''
  return (
    <button className="transaction-row" onClick={onClick} type="button">
      <span className="category-glyph"><Icon aria-hidden="true" /></span>
      <span className="transaction-merchant"><strong>{transaction.merchant_normalized}</strong><small>{transaction.source.replaceAll('_', ' ')}</small></span>
      <span className="transaction-category"><strong>{transaction.category_name ?? t('uncategorized')}</strong></span>
      <span className="transaction-payment"><strong>{transaction.payment_method_name ?? transaction.card_raw_name ?? t('noPayment')}</strong></span>
      <span className="transaction-time"><span>{formatDateTime(transaction.transaction_date)}</span></span>
      <span className={`review-mark ${transaction.review_status}`}><StatusIcon aria-hidden="true" /><span>{statusLabel}</span></span>
      <span className={`transaction-amount ${transaction.type}`}><strong>{sign}{formatMoney(transaction.amount_minor, transaction.currency)}</strong><small>{transaction.category_name ?? t('uncategorized')}</small></span>
    </button>
  )
}
