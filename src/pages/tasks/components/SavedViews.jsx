import React, { useEffect, useState } from 'react'
import { FiBookmark, FiPlus, FiTrash2, FiShare2 } from 'react-icons/fi'
import Popover from './Popover'

const STORAGE_KEY = 'ecs.tasks.savedViews.v1'

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* noop */ }
}

export default function SavedViews({ filters, onApply }) {
  const [views, setViews] = useState(() => read())
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)

  useEffect(() => {
    const handler = () => setViews(read())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const save = () => {
    const name = window.prompt('Name this view')
    if (!name) return
    const snap = { ...filters }
    const next = [...views.filter(v => v.name !== name), { name, filters: snap, created_at: Date.now() }]
    setViews(next); write(next)
  }
  const remove = (name) => {
    const next = views.filter(v => v.name !== name)
    setViews(next); write(next)
  }
  const share = (v) => {
    const params = new URLSearchParams()
    for (const [k, val] of Object.entries(v.filters || {})) {
      if (val != null && val !== '') params.set(k, val)
    }
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    navigator.clipboard?.writeText(url)
      .then(() => alert('View URL copied to clipboard'))
      .catch(() => window.prompt('Copy this URL', url))
  }

  return (
    <>
      <button
        onClick={(e) => { setAnchor(e.currentTarget); setOpen(true) }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--stroke)] text-xs text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
      >
        <FiBookmark className="w-3 h-3" /> Views
      </button>
      {open && (
        <Popover anchor={anchor} onClose={() => setOpen(false)}>
          <div className="py-1 max-h-72 overflow-y-auto min-w-[240px]">
            {views.length === 0 && (
              <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No saved views yet.</div>
            )}
            {views.map(v => (
              <div key={v.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm group">
                <button onClick={() => { onApply?.(v.filters); setOpen(false) }} className="flex-1 text-left truncate">
                  {v.name}
                </button>
                <button onClick={() => share(v)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Copy URL">
                  <FiShare2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(v.name)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500" title="Delete">
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="border-t border-[var(--stroke)]">
              <button onClick={save} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm text-[var(--accent)]">
                <FiPlus className="w-3.5 h-3.5" /> Save current view
              </button>
            </div>
          </div>
        </Popover>
      )}
    </>
  )
}
