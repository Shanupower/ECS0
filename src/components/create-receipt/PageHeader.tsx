import React from 'react'
import { FileText, Plus } from 'lucide-react'
import { PrimaryButton } from './PrimaryButton'

interface PageHeaderProps {
  onNewReceipt?: () => void
}

export function PageHeader({ onNewReceipt }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]">
          <FileText className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--dashboard-text)]">
            Create Receipt
          </h1>
          <p className="mt-0.5 text-sm text-[var(--dashboard-muted)]">
            Generate financial receipt step-by-step
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--dashboard-border)]/80 text-[var(--dashboard-muted)]">
          Takes ~20 seconds
        </span>
        <PrimaryButton onClick={onNewReceipt} icon={<Plus className="w-4 h-4" />}>
          New Receipt
        </PrimaryButton>
      </div>
    </div>
  )
}
