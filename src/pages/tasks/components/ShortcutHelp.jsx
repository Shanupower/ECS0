import React from 'react'
import { FiX } from 'react-icons/fi'

const GROUPS = [
  {
    name: 'General',
    items: [
      ['⌘K', 'Command palette'],
      ['⌘⇧K', 'Quick add task'],
      ['N', 'New task'],
      ['/', 'Focus search'],
      ['?', 'Toggle this help']
    ]
  },
  {
    name: 'Navigation',
    items: [
      ['J / K', 'Next / previous task'],
      ['Enter', 'Open task'],
      ['Space', 'Toggle select'],
      ['Esc', 'Close drawer / modal']
    ]
  },
  {
    name: 'Actions',
    items: [
      ['C', 'Change status'],
      ['E', 'Edit title'],
      ['X', 'Delete task'],
      ['Shift+J / Shift+K', 'Extend selection'],
      ['⌘A', 'Select all visible'],
      ['⌘Enter', 'Post comment']
    ]
  }
]

export default function ShortcutHelp({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--stroke)]">
          <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {GROUPS.map(g => (
            <div key={g.name}>
              <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">{g.name}</h4>
              <div className="space-y-1">
                {g.items.map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{d}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
