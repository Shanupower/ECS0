import React from 'react'

function Block({ className = '' }) {
  return (
    <div
      className={`rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] animate-pulse ${className}`}
      aria-hidden
    />
  )
}

export default function SectionSkeleton({ section = 'analytics' }) {
  if (section === 'admin') {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading administration">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Block className="h-20" />
          <Block className="h-20" />
          <Block className="h-20" />
          <Block className="h-20" />
        </div>
        <Block className="h-10" />
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 border-b border-[var(--stroke)] last:border-b-0 animate-pulse bg-[var(--card-bg)]"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading section">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Block className="h-64 lg:col-span-2" />
        <Block className="h-64" />
      </div>
      <Block className="h-56" />
    </div>
  )
}
