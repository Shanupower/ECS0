import React from 'react'

function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase()
}

function hashHue(str) {
  let h = 0
  for (let i = 0; i < String(str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

export default function UserAvatar({ name, size = 24, className = '' }) {
  const hue = hashHue(name || 'x')
  const bg = `hsl(${hue}, 55%, 45%)`
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-[10px] font-semibold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
      title={name || 'Unassigned'}
    >
      {initials(name)}
    </span>
  )
}
