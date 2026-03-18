import React, { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { Input } from '../ui/Input'
import { ContinueButton } from './PrimaryButton'

export interface EmployeePreview {
  name: string
  branch: string
  email: string
}

interface EmployeeInfoCardProps {
  employeeCode: string
  employeePreview: EmployeePreview | null
  onEmployeeCodeChange?: (code: string) => void
  onContinue: () => void
  progressSaved?: boolean
  disabled?: boolean
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function EmployeeInfoCard({
  employeeCode,
  employeePreview,
  onEmployeeCodeChange,
  onContinue,
  progressSaved = false,
  disabled = false,
}: EmployeeInfoCardProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onContinue()
      }
    },
    [onContinue]
  )

  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        onContinue()
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown)
    return () => window.removeEventListener('keydown', onGlobalKeyDown)
  }, [onContinue])

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-6 shadow-[var(--dashboard-shadow-card)]"
    >
      <h2 className="text-lg font-semibold text-[var(--dashboard-text)] mb-6">
        Employee Information
      </h2>

      <div className="space-y-4">
        <div>
          <Input
            label="Employee Code"
            id="employee-code"
            value={employeeCode}
            onChange={(e) => onEmployeeCodeChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly
            className="bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)]"
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]">
              Auto-filled
            </span>
            <span className="text-xs text-[var(--dashboard-muted)]">
              Verified from login session
            </span>
          </div>
        </div>

        <div className="h-px bg-[var(--dashboard-border)]" />

        {employeePreview && (
          <div className="rounded-lg bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)] p-4 space-y-3">
            <p className="text-sm text-[var(--dashboard-muted)]">
              <span className="font-medium text-[var(--dashboard-text)]">Name:</span>{' '}
              {employeePreview.name}
            </p>
            <p className="text-sm text-[var(--dashboard-muted)]">
              <span className="font-medium text-[var(--dashboard-text)]">Branch:</span>{' '}
              {employeePreview.branch}
            </p>
            <p className="text-sm text-[var(--dashboard-muted)]">
              <span className="font-medium text-[var(--dashboard-text)]">Email:</span>{' '}
              {employeePreview.email}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="text-xs text-[var(--dashboard-muted)]">
          {progressSaved ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden />
              Progress saved
            </span>
          ) : (
            'Press Enter to Continue'
          )}
        </span>
        <ContinueButton onClick={onContinue} disabled={disabled} />
      </div>
    </motion.div>
  )
}
