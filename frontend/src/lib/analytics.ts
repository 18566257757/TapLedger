import type { AnalyticsMetric } from '../types/api'

type MetricValues = {
  net_spending_minor: number
  net_income_minor: number
  total_minor: number
}

export function analyticsMetricValue(item: MetricValues, metric: AnalyticsMetric) {
  if (metric === 'net_income') return item.net_income_minor
  if (metric === 'total') return item.total_minor
  return item.net_spending_minor
}
