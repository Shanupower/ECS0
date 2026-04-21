import React from 'react'
import { FiPhone, FiMessageSquare, FiMail, FiCalendar, FiClock, FiMapPin, FiArchive, FiAlertCircle } from 'react-icons/fi'
import {
  daysInStage,
  daysInStagePillColor,
  daysSinceWon,
  daysSinceLost,
  formatValue,
  hasOverdueFollowUp,
  isStale,
  isFollowUpToday,
  leadDisplayName,
  normalisePhone,
  wonAgePillColor
} from './utils'

function initials(name) {
  if (!name) return '·'
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '·'
}

/**
 * Rich lead card supporting drag-and-drop, click-to-open drawer, and
 * shift-click multi-select.
 */
export default function LeadCard({
  lead,
  ownerLabel,
  showBranchPill = false,
  staleThresholdDays = 7,
  wonArchiveDays = 14,
  lostArchiveDays = 60,
  selected = false,
  dimOthers = false,
  onOpen,
  onSelect,
  onDragStart,
  onDragEnd,
  draggable = true
}) {
  const stage = lead.stage
  const archived = !!lead.archived_at
  const days = daysInStage(lead)
  const overdueFollowUp = hasOverdueFollowUp(lead)
  const followUpToday = isFollowUpToday(lead)
  const stale = isStale(lead, staleThresholdDays)
  const noNextAction = !lead.next_follow_up_at && !stale && stage !== 'Won' && stage !== 'Lost'
  const valueLabel = formatValue(lead.value ?? lead.expected_value)
  const wonAgeDays = daysSinceWon(lead)
  const lostAgeDays = daysSinceLost(lead)
  const wonExpiresIn = wonAgeDays != null ? Math.max(0, wonArchiveDays - wonAgeDays) : null
  const lostExpiresIn = lostAgeDays != null ? Math.max(0, lostArchiveDays - lostAgeDays) : null
  const unConvertedWonExpiry = stage === 'Won' && !lead.converted_to_customer_id
  const notePreview = (lead.notes || '').trim().slice(0, 140)
  const phoneRaw = normalisePhone(lead.contact_phone)

  const handleClick = (e) => {
    if (e.shiftKey && onSelect) { e.preventDefault(); onSelect(lead, 'shift'); return }
    if (e.metaKey || e.ctrlKey) { if (onSelect) { onSelect(lead, 'toggle'); return } }
    onOpen && onOpen(lead)
  }
  const handleCheck = (e) => {
    e.stopPropagation()
    if (onSelect) onSelect(lead, 'toggle')
  }

  const needsAttention = overdueFollowUp || noNextAction || stale
  const leftAccent = overdueFollowUp ? 'bg-rose-500'
    : followUpToday ? 'bg-amber-400'
    : stale ? 'bg-amber-400'
    : null

  return (
    <div
      draggable={draggable && !archived}
      onDragStart={(e) => draggable && onDragStart && onDragStart(e, lead)}
      onDragEnd={(e) => draggable && onDragEnd && onDragEnd(e, lead)}
      onClick={handleClick}
      className={[
        'group relative rounded-lg border bg-[var(--card-bg-opaque)] cursor-pointer transition-all',
        selected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-md'
          : 'border-[var(--stroke)] hover:border-[var(--text-muted)]/50 hover:shadow-sm',
        dimOthers ? 'opacity-40' : '',
        archived ? 'opacity-70' : ''
      ].join(' ')}
    >
      {leftAccent && (
        <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${leftAccent}`} />
      )}

      <div className="p-2.5 space-y-2">
        <div className="flex items-start gap-2">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={handleCheck}
              className="mt-0.5 w-3.5 h-3.5 rounded border-[var(--stroke)] text-[var(--accent)] focus:ring-[var(--ring)] focus:ring-offset-0"
              aria-label="Select lead"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate leading-tight">
                {leadDisplayName(lead)}
              </p>
              {valueLabel && (
                <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap tabular-nums bg-[var(--card-hover)] px-1.5 py-0.5 rounded">
                  {valueLabel}
                </span>
              )}
            </div>
            {lead.contact_phone && (
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 tabular-nums">{lead.contact_phone}</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        {(lead.contact_phone || lead.contact_email) && (
          <div className="flex items-center gap-0.5 -my-1" onClick={(e) => e.stopPropagation()}>
            {lead.contact_phone && (
              <a
                href={`tel:${phoneRaw}`}
                title={`Call ${lead.contact_phone}`}
                className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--card-hover)]"
                aria-label="Call"
              >
                <FiPhone className="w-3 h-3" />
              </a>
            )}
            {lead.contact_phone && (
              <a
                href={`https://wa.me/${phoneRaw.replace('+', '')}`}
                target="_blank" rel="noreferrer"
                title="Chat on WhatsApp"
                className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-muted)] hover:text-emerald-600 hover:bg-[var(--card-hover)]"
                aria-label="WhatsApp"
              >
                <FiMessageSquare className="w-3 h-3" />
              </a>
            )}
            {lead.contact_email && (
              <a
                href={`mailto:${lead.contact_email}`}
                title={`Email ${lead.contact_email}`}
                className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--card-hover)]"
                aria-label="Email"
              >
                <FiMail className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-1">
          {stage !== 'Won' && stage !== 'Lost' && (
            <Chip className={daysInStagePillColor(days)} icon={<FiClock className="w-2.5 h-2.5" />}>
              {days}d
            </Chip>
          )}
          {unConvertedWonExpiry && wonExpiresIn != null && (
            <Chip className={wonAgePillColor(wonAgeDays)} icon={<FiArchive className="w-2.5 h-2.5" />}>
              {wonExpiresIn > 0 ? `${wonExpiresIn}d to archive` : 'archiving today'}
            </Chip>
          )}
          {stage === 'Lost' && lostExpiresIn != null && (
            <Chip className="bg-[var(--card-hover)] text-[var(--text-muted)]" icon={<FiArchive className="w-2.5 h-2.5" />}>
              {lostExpiresIn > 0 ? `${lostExpiresIn}d to archive` : 'archiving today'}
            </Chip>
          )}
          {lead.next_follow_up_at ? (
            <Chip
              className={
                overdueFollowUp ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                : followUpToday ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
              }
              icon={<FiCalendar className="w-2.5 h-2.5" />}
            >
              {overdueFollowUp ? `Overdue ${lead.next_follow_up_at}` : followUpToday ? 'Today' : lead.next_follow_up_at}
            </Chip>
          ) : noNextAction ? (
            <Chip className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60" icon={<FiAlertCircle className="w-2.5 h-2.5" />}>
              No next action
            </Chip>
          ) : null}
          {stale && !overdueFollowUp && (
            <Chip className="bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Stale
            </Chip>
          )}
          {lead.source && (
            <Chip className="bg-[var(--card-hover)] text-[var(--text-secondary)]">
              {lead.source}
            </Chip>
          )}
          {Array.isArray(lead.tags) && lead.tags.slice(0, 2).map((tag) => (
            <Chip key={tag} className="bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
              {tag}
            </Chip>
          ))}
        </div>

        {notePreview && (
          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {notePreview}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--stroke)]/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--card-hover)] text-[9px] font-semibold text-[var(--text-primary)] flex-shrink-0">
              {initials(ownerLabel)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {ownerLabel || lead.assigned_to_emp_code || 'Unassigned'}
            </span>
            {showBranchPill && lead.branch && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-[var(--card-hover)] text-[var(--text-muted)] flex-shrink-0">
                <FiMapPin className="w-2 h-2" /> {lead.branch}
              </span>
            )}
          </div>
          {archived && (
            <span className="text-[9px] uppercase tracking-wide text-[var(--text-muted)] flex-shrink-0">archived</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ children, className = '', icon }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${className}`}>
      {icon}
      {children}
    </span>
  )
}
