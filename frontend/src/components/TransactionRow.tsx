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
  const { t, locale, categoryLabel, sourceLabel, reviewStatusLabel } = useLocale()
  const Icon = categoryIcons[transaction.category_name as keyof typeof categoryIcons] ?? HelpCircle
  const statusLabel = reviewStatusLabel(transaction.review_status)
  const StatusIcon = transaction.review_status === 'confirmed' ? CircleCheck : CircleAlert
  const sign = transaction.type === 'expense' ? '-' : transaction.type === 'refund' ? '+' : ''
  const paymentLabel = transaction.payment_method_name ?? transaction.card_raw_name ?? t('noPayment')
  return (
    <button className="transaction-row" onClick={onClick} type="button">
      <span className="category-glyph"><Icon aria-hidden="true" /></span>
      <span className="transaction-merchant"><strong>{transaction.merchant_normalized}</strong><small>{sourceLabel(transaction.source)}</small><small className="transaction-mobile-payment">{paymentLabel}</small></span>
      <span className="transaction-category"><strong>{categoryLabel(transaction.category_name)}</strong></span>
      <span className="transaction-payment"><strong>{paymentLabel}</strong></span>
      <span className="transaction-time"><span>{formatDateTime(transaction.transaction_date, locale)}</span></span>
      <span className={`review-mark ${transaction.review_status}`}><StatusIcon aria-hidden="true" /><span>{statusLabel}</span></span>
      <span className={`transaction-amount ${transaction.type}`}><strong>{sign}{formatMoney(transaction.amount_minor, transaction.currency, locale)}</strong><small>{categoryLabel(transaction.category_name)}</small></span>
    </button>
  )
}
