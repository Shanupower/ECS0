import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Frosted glass card with optional hover glow. Uses theme tokens; fallback for no backdrop-filter.
 * @param {Object} props
 * @param {'default'|'elevated'} [props.variant]
 * @param {boolean} [props.hover]
 * @param {string} [props.padding] - e.g. 'none', 'sm', 'md', 'lg'
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children]
 */
export function Card({ variant = 'default', hover = false, padding = 'md', className, children, ...rest }) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }[padding]

  return (
    <div
      className={cn(
        'rounded-card border border-[var(--stroke)] bg-[var(--card-bg)] shadow-card backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]',
        variant === 'elevated' && 'shadow-md',
        hover && 'transition-shadow duration-200 hover:shadow-glow hover:bg-[var(--card-hover)]',
        paddingClass,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
