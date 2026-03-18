import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../utils/cn'

interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  className?: string
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon,
  iconPosition = 'right',
  className,
}: PrimaryButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold',
        'bg-[var(--dashboard-primary)] text-white',
        'hover:bg-[var(--dashboard-primary-hover)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:ring-offset-2 focus:ring-offset-[var(--dashboard-bg)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        'transition-colors',
        className
      )}
    >
      {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </motion.button>
  )
}

export function ContinueButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <PrimaryButton onClick={onClick} disabled={disabled} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
      Continue →
    </PrimaryButton>
  )
}
