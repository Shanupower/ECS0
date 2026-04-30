// Shared lead helpers. Keep pure — no React imports.

export const DEFAULT_STAGES = ['New', 'Contacted', 'Meeting Scheduled', 'Met', 'Proposal Sent', 'Won', 'Lost']

export const CLOSED_STAGES = new Set(['Won', 'Lost'])

export const DEFAULT_STAGE_WEIGHTS = {
  New: 0.10,
  Contacted: 0.25,
  'Meeting Scheduled': 0.35,
  Met: 0.50,
  'Proposal Sent': 0.75,
  Won: 1.0,
  Lost: 0
}

export function msPerDay() { return 86_400_000 }

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function parseDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysSince(iso) {
  const d = parseDate(iso)
  if (!d) return null
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / msPerDay()))
}

export function daysUntil(iso) {
  const d = parseDate(iso)
  if (!d) return null
  const diff = d.getTime() - Date.now()
  return Math.floor(diff / msPerDay())
}

export function daysInStage(lead) {
  return daysSince(lead?.updated_at || lead?.created_at) ?? 0
}

export function daysSinceWon(lead) {
  return daysSince(lead?.won_at)
}

export function daysSinceLost(lead) {
  return daysSince(lead?.lost_at)
}

export function isStale(lead, staleThresholdDays = 7) {
  if (!lead) return false
  if (CLOSED_STAGES.has(lead.stage)) return false
  const days = daysInStage(lead)
  const noNextAction = !lead.next_follow_up_at
  return days > staleThresholdDays && noNextAction
}

export function hasOverdueFollowUp(lead) {
  if (!lead?.next_follow_up_at) return false
  const due = parseDate(lead.next_follow_up_at)
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function isFollowUpToday(lead) {
  if (!lead?.next_follow_up_at) return false
  const due = parseDate(lead.next_follow_up_at)
  if (!due) return false
  return due.toISOString().slice(0, 10) === todayIso()
}

export function formatValue(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return null
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 2)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
  return `₹${n}`
}

export function weightedPipelineValue(leads, weights = DEFAULT_STAGE_WEIGHTS) {
  if (!Array.isArray(leads)) return 0
  return leads.reduce((sum, lead) => {
    if (!lead || CLOSED_STAGES.has(lead.stage)) return sum
    const v = Number(lead.value || lead.expected_value || 0)
    if (!Number.isFinite(v) || v <= 0) return sum
    const w = Number(weights?.[lead.stage] ?? 0)
    return sum + v * w
  }, 0)
}

export function leadDisplayName(lead) {
  return (lead?.name || 'Untitled lead').trim()
}

export function normalisePhone(phone) {
  if (!phone) return ''
  return String(phone).replace(/[^0-9+]/g, '')
}

export function daysInStagePillColor(days) {
  if (days >= 8) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  if (days >= 4) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-[var(--card-hover)] text-[var(--text-muted)]'
}

export function wonAgePillColor(days) {
  if (days == null) return 'bg-[var(--card-hover)] text-[var(--text-muted)]'
  if (days >= 11) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  if (days >= 7) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-[var(--card-hover)] text-[var(--text-muted)]'
}
