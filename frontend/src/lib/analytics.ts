import type { AnalyticsMetric, BreakdownItem, TrendPoint } from '../types/api'

type MetricValues = Pick<TrendPoint | BreakdownItem, 'net_spending_minor' | 'net_income_minor' | 'total_minor'>

export function analyticsMetricValue(item: MetricValues, metric: AnalyticsMetric) {
  if (metric === 'net_income') return item.net_income_minor
  if (metric === 'total') return item.total_minor
  return item.net_spending_minor
}
