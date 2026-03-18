import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Loading placeholder. Lines or block using theme muted color and animation.
 * @param {Object} props
 * @param {'line'|'block'|'card'} [props.variant] - line = single line, block = rectangle, card = card-shaped
 * @param {string} [props.className]
 * @param {number} [props.lines] - for variant line, number of lines
 */
export function Skeleton({ variant = 'line', className, lines = 1 }) {
  const base = 'animate-pulse rounded-lg bg-[var(--text-muted)]/20'

  if (variant === 'line') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, 'h-4')}
            style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'block') {
    return <div className={cn(base, 'h-24 w-full', className)} />
  }

  if (variant === 'card') {
    return (
      <div className={cn(base, 'h-32 w-full', className)} />
    )
  }

  return <div className={cn(base, 'h-4 w-full', className)} />
}
