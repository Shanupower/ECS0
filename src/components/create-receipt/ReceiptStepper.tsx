import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../utils/cn'

const STEPS = [
  { id: 1, label: 'Employee' },
  { id: 2, label: 'Investor' },
  { id: 3, label: 'Product' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Review' },
] as const

interface ReceiptStepperProps {
  currentStep: number
  className?: string
}

export function ReceiptStepper({ currentStep, className }: ReceiptStepperProps) {
  return (
    <nav aria-label="Receipt creation progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isFuture = currentStep < step.id
          const stepNumber = index + 1

          return (
            <React.Fragment key={step.id}>
              <li className="flex flex-1 items-center min-w-0">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isCurrent ? 1 : isCompleted ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 min-w-0 flex-1',
                    isCurrent && 'bg-[var(--dashboard-primary)]/12 text-[var(--dashboard-primary)]',
                    isCompleted && 'text-[var(--dashboard-text)]',
                    isFuture && 'text-[var(--dashboard-muted)]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      isCompleted && 'bg-[var(--dashboard-primary)] text-white',
                      isCurrent && 'bg-[var(--dashboard-primary)] text-white',
                      isFuture && 'bg-[var(--dashboard-border)] text-[var(--dashboard-muted)]'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : stepNumber}
                  </span>
                  <span className="text-sm font-medium truncate">{step.label}</span>
                </motion.div>
              </li>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 max-w-[24px] rounded-full transition-colors',
                    isCompleted ? 'bg-[var(--dashboard-primary)]' : 'bg-[var(--dashboard-border)]'
                  )}
                  aria-hidden
                />
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
