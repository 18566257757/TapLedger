import { useLocale } from '../app/LocaleProvider'
import type { AnalyticsMetric } from '../types/api'

const metricOptions = [
  { value: 'net_spending', label: 'netSpending' },
  { value: 'net_income', label: 'netIncome' },
  { value: 'total', label: 'totalAmount' },
] as const

export function ChartMetricSwitch({ value, onChange, className = '' }: { value: AnalyticsMetric; onChange: (metric: AnalyticsMetric) => void; className?: string }) {
  const { t } = useLocale()
  return (
    <div className={`chart-metric-switch ${className}`.trim()} role="group" aria-label={t('chartMetric')}>
      {metricOptions.map((option) => (
        <button type="button" key={option.value} className={value === option.value ? 'selected' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {t(option.label)}
        </button>
      ))}
    </div>
  )
}
