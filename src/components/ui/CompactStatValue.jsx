import React from 'react'
import { cn } from '../../utils/cn'
import {
  formatINR,
  formatIndianWordsINR,
  formatIndianWordsCount,
  COMPACT_MONEY_THRESHOLD,
  COMPACT_COUNT_THRESHOLD
} from '../../utils/format-money'

/**
 * KPI value for cards with class `dashboard-kpi-expandable`.
 * Shows Indian short form (crore / lakh / K); parent card hover reveals full value.
 */
export default function CompactStatValue({ value, kind = 'money', className, size = 'lg' }) {
  const num = Number(value) || 0
  const threshold = kind === 'money' ? COMPACT_MONEY_THRESHOLD : COMPACT_COUNT_THRESHOLD
  const full =
    kind === 'money'
      ? formatINR(num)
      : new Intl.NumberFormat('en-IN').format(Number.isFinite(num) ? num : 0)
  const useShort = Math.abs(num) >= threshold
  const short =
    kind === 'money' ? formatIndianWordsINR(num) : formatIndianWordsCount(num)

  const sizeClass =
    size === 'xl'
      ? 'text-xl'
      : size === 'md'
        ? 'text-lg'
        : 'text-xl sm:text-2xl min-[1536px]:text-3xl'

  if (!useShort) {
    return (
      <div className={cn('font-bold tracking-tight tabular-nums', sizeClass, className)}>
        {full}
      </div>
    )
  }

  return (
    <div
      className={cn('kpi-stat-value relative min-h-[2.5rem]', className)}
      aria-label={`${short}, exact value ${full}`}
    >
      <span
        className={cn(
          'kpi-short block font-bold tracking-tight tabular-nums leading-tight transition-opacity duration-300 ease-out',
          sizeClass
        )}
      >
        {short}
      </span>
      <span
        className={cn(
          'kpi-full block font-bold tracking-tight tabular-nums leading-tight transition-opacity duration-300 ease-out',
          sizeClass
        )}
      >
        {full}
      </span>
    </div>
  )
}
