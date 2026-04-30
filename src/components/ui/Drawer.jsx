import React, { useEffect } from 'react'
import { cn } from '../../utils/cn'
import { FiX } from 'react-icons/fi'
import { useEscapeClose } from '../../hooks/useEscapeClose'

/**
 * Slide-over panel for detail view (e.g. issue, transaction, user). Frosted glass; close button.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @param {'left'|'right'} [props.side]
 */
export function Drawer({ open, onClose, title, children, className, side = 'right' }) {
  useEscapeClose(open, onClose)
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

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto border-[var(--stroke)] bg-[var(--card-bg)] shadow-lg backdrop-blur-[20px]',
          side === 'right' ? 'right-0 border-l animate-[slideInRight_0.25s_ease-out]' : 'left-0 border-r animate-[slideInLeft_0.25s_ease-out]',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--stroke)] bg-[var(--card-bg)]/90 px-4 py-3 backdrop-blur-[12px]">
          {title && (
            <h2 id="drawer-title" className="text-title font-semibold text-[var(--text)]">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            aria-label="Close panel"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </aside>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
