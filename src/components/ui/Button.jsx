import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-white shadow-glass-sm hover:bg-[var(--accent-hover)]',
        primary:
          'bg-[var(--accent)] text-white shadow-glass-sm hover:bg-[var(--accent-hover)]',
        secondary:
          'bg-[var(--dashboard-card)] border border-[var(--dashboard-border)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/40',
        ghost: 'text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50',
        outline:
          'border border-[var(--dashboard-border)] bg-transparent text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/30'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  )
})
Button.displayName = 'Button'
export { buttonVariants }
