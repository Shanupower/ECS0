import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const POLL_MS = 60_000

function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationBell() {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef(null)
  const buttonRef = useRef(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.listNotifications(token, { limit: '20' })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setUnread(Number(data?.unread || 0))
    } catch (err) {
      // Gracefully ignore if endpoint isn't live yet (keeps bell harmless).
      console.warn('notifications load failed:', err?.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (popoverRef.current?.contains(e.target)) return
      if (buttonRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markAllRead = async () => {
    if (!token || !unread) return
    try {
      await api.markNotificationsRead(token, [])
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
      setUnread(0)
    } catch (err) {
      console.warn('mark all read failed:', err?.message)
    }
  }

  const markOne = async (n) => {
    if (!token || n.read_at) return
    try {
      await api.markNotificationsRead(token, [n._key])
      setItems((prev) => prev.map((x) => (x._key === n._key ? { ...x, read_at: new Date().toISOString() } : x)))
      setUnread((u) => Math.max(0, u - 1))
    } catch { /* noop */ }
  }

  const badge = useMemo(() => {
    if (!unread) return null
    return unread > 99 ? '99+' : String(unread)
  }, [unread])

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center font-semibold">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] shadow-xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--dashboard-border)]">
            <span className="text-sm font-semibold text-[var(--dashboard-text)]">Notifications</span>
            <button
              onClick={markAllRead}
              disabled={!unread}
              className="text-xs text-[var(--dashboard-primary)] hover:underline disabled:text-[var(--dashboard-muted)] disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          <div className="overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--dashboard-muted)]">Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-[var(--dashboard-muted)]">
                No notifications yet.
              </div>
            )}
            {items.map((n) => (
              <button
                key={n._key}
                type="button"
                onClick={() => markOne(n)}
                className={`w-full text-left px-3 py-2 border-b border-[var(--dashboard-border)]/60 last:border-b-0 transition-colors ${
                  n.read_at ? 'opacity-70' : 'bg-[var(--dashboard-primary)]/5'
                } hover:bg-[var(--dashboard-border)]/40`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--dashboard-primary)] flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--dashboard-text)] truncate">{n.title || 'Notification'}</div>
                    {n.body && (
                      <div className="text-[11px] text-[var(--dashboard-muted)] line-clamp-2">{n.body}</div>
                    )}
                    <div className="text-[10px] text-[var(--dashboard-muted)] mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
