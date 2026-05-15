import * as React from 'react'
import { cn } from '../../utils/cn'

export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-bg)] px-3 py-2 text-sm text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'
