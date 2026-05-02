import React, { useEffect } from 'react'
import { cn } from '../../utils/cn'
import { useEscapeClose } from '../../hooks/useEscapeClose'

/**
 * Centered overlay dialog. Use with DashboardLayout: shell owns page gutters; Modal owns overlay safe-area padding.
 * Variants preserve existing theme tokens so migrating routes does not flatten visual styles.
 */
const VARIANT_PANEL = {
  dashboard:
    'border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] shadow-2xl',
  glass:
    'border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] shadow-glass-lg backdrop-blur-[20px]',
  legacy:
    'border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
}

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[min(96vw,72rem)]',
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.ReactNode} props.children
 * @param {'dashboard'|'glass'|'legacy'} [props.variant]
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'full'} [props.size]
 * @param {'center'|'top'} [props.position] — top = anchor below browser chrome on small screens (command palette style)
 * @param {boolean} [props.closeOnBackdrop]
 * @param {boolean} [props.closeOnEscape] — set false for blocking dialogs (e.g. forced password change)
 * @param {string} [props.className] — panel classes
 * @param {string} [props.backdropClassName]
 */
export function Modal({
  open,
  onClose,
  children,
  variant = 'dashboard',
  size = 'md',
  position = 'center',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  backdropClassName,
}) {
  useEscapeClose(open && closeOnEscape, onClose)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md
  const variantCls = VARIANT_PANEL[variant] || VARIANT_PANEL.dashboard

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center p-3 sm:p-4 ps-safe pe-safe pt-safe pb-safe',
        position === 'top' ? 'items-start pt-[min(10dvh,5rem)] sm:pt-[12dvh]' : 'items-center'
      )}
      role="presentation"
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm dark:bg-black/80',
          backdropClassName
        )}
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex w-full min-h-0 flex-col rounded-2xl',
          'max-h-[min(90dvh,calc(100dvh-1rem))]',
          sizeCls,
          variantCls,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ children, className }) {
  return (
    <div className={cn('flex-shrink-0 border-b border-[var(--stroke)] px-4 py-4 sm:px-6', className)}>
      {children}
    </div>
  )
}

export function ModalBody({ children, className, scrollable = true }) {
  return (
    <div className={cn('min-h-0 flex-1', scrollable && 'overflow-y-auto overscroll-contain', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex-shrink-0 border-t border-[var(--stroke)] px-4 py-4 sm:px-6', className)}>
      {children}
    </div>
  )
}
