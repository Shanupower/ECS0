import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '../../utils/cn'
import { FiCheck, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

const ToastContext = createContext(null)

/** @param {{ id: string, type: 'success'|'error'|'info', message: string }[]} toasts */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((type, message, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, type, message }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = {
    success: (msg, duration) => add('success', msg, duration),
    error: (msg, duration) => add('error', msg, duration),
    info: (msg, duration) => add('info', msg, duration),
    remove,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function Toast({ id, type, message, onDismiss }) {
  const icons = {
    success: FiCheck,
    error: FiAlertCircle,
    info: FiInfo,
  }
  const Icon = icons[type]
  const styles = {
    success: 'bg-[var(--success-muted)] border-[var(--success)]/30 text-[var(--success)]',
    error: 'bg-[var(--error-muted)] border-[var(--error)]/30 text-[var(--error)]',
    info: 'bg-[var(--accent-muted)] border-[var(--accent)]/30 text-[var(--accent)]',
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-card border px-4 py-3 shadow-lg backdrop-blur-[20px] min-w-[280px] max-w-[420px]',
        styles[type]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="text-body font-medium text-[var(--text-primary)] flex-1 min-w-0">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 rounded-full p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-transparent transition-colors"
        aria-label="Dismiss"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  )
}
