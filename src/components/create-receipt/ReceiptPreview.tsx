import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface ReceiptPreviewData {
  receiptNumber?: string
  employee?: string
  investor?: string
  product?: string
  issuer?: string
  scheme?: string
  amount?: string | number
  total?: string | number
}

interface ReceiptPreviewProps {
  data: ReceiptPreviewData
  className?: string
}

const fieldLabels: { key: keyof ReceiptPreviewData; label: string }[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'investor', label: 'Investor' },
  { key: 'product', label: 'Product' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'scheme', label: 'Scheme' },
  { key: 'amount', label: 'Amount' },
]

function formatValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'number') return `₹${value.toLocaleString('en-IN')}`
  return String(value)
}

export function ReceiptPreview({ data, className }: ReceiptPreviewProps) {
  const total = data.total ?? 0
  const totalFormatted = typeof total === 'number' ? `₹${total.toLocaleString('en-IN')}` : (total || '₹0')

  return (
    <motion.aside
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex-shrink-0 w-[320px] flex flex-col rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] overflow-hidden shadow-[var(--dashboard-shadow-card)]',
        className
      )}
    >
      <div className="p-4 border-b border-[var(--dashboard-border)]">
        <h2 className="text-sm font-semibold text-[var(--dashboard-text)]">
          Receipt Preview
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider mb-1">
            Receipt number
          </p>
          <p className="text-lg font-mono font-semibold text-[var(--dashboard-text)]">
            #{data.receiptNumber || '0000000'}
          </p>
        </div>

        <div className="space-y-3">
          {fieldLabels.map(({ key, label }) => (
            <div key={key} className="flex justify-between gap-2 text-sm">
              <span className="text-[var(--dashboard-muted)] shrink-0">{label}</span>
              <span className="text-[var(--dashboard-text)] text-right truncate">
                {formatValue(data[key] as string | number | undefined)}
              </span>
            </div>
          ))}
        </div>

        <div className="h-px bg-[var(--dashboard-border)]" />

        <div className="flex justify-between items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--dashboard-text)]">Total</span>
          <span className="text-lg font-semibold text-[var(--dashboard-text)]">
            {totalFormatted}
          </span>
        </div>
      </div>
    </motion.aside>
  )
}
