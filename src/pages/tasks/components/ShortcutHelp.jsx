import React from 'react'
import { FiX } from 'react-icons/fi'
import { Modal } from '../../../components/ui/Modal'

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
  return (
    <Modal open={open} onClose={onClose} variant="glass" size="md">
      <div className="flex max-h-[inherit] min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--stroke)] shrink-0">
          <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {GROUPS.map(g => (
            <div key={g.name}>
              <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">{g.name}</h4>
              <div className="space-y-1">
                {g.items.map(([k, d]) => (
                  <div key={k} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-[var(--text-secondary)] min-w-0">{d}</span>
                    <kbd className="shrink-0 px-1.5 py-0.5 text-[10px] rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
