import React from 'react'
import { cn } from '../../utils/cn'

const paddingClass = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

/**
 * Dashboard / app card with consistent internal padding.
 */
export function Card({
  variant = 'default',
  hover = false,
  padding = 'md',
  className,
  children,
  ...rest
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] shadow-card',
        variant === 'elevated' && 'shadow-md',
        hover &&
          'transition-[transform,box-shadow,background-color] duration-200 hover:shadow-md hover:bg-[var(--card-hover)]',
        paddingClass[padding] ?? paddingClass.md,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-[var(--dashboard-muted)]', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-2', className)} {...props} />
}
