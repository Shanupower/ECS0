import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const DEFAULTS = {
  lead_stages: ['New', 'Contacted', 'Meeting Scheduled', 'Met', 'Proposal Sent', 'Won', 'Lost'],
  lead_stage_probabilities: {
    New: 0.10,
    Contacted: 0.25,
    'Meeting Scheduled': 0.35,
    Met: 0.50,
    'Proposal Sent': 0.75,
    Won: 1.0,
    Lost: 0
  },
  lead_sources: ['IndiaMart', 'Website', 'Referral', 'Walk-in', 'Cold call', 'Event', 'Other'],
  lead_lost_reasons: ['Price', 'Timing', 'Went with competitor', 'Unqualified', 'No response', 'Other'],
  lead_tags: ['HNI', 'NRI', 'Hot', 'Cold', 'VIP'],
  lead_stale_threshold_days: 7,
  lead_won_archive_days: 14,
  lead_lost_archive_days: 60,
  review_tier_cadence_months: { A: 12, B: 6, C: 3 },

  // Tasks redesign
  task_statuses: [
    { key: 'backlog',     label: 'Backlog',     category: 'unstarted', color: 'slate'   },
    { key: 'todo',        label: 'To do',       category: 'unstarted', color: 'blue'    },
    { key: 'in_progress', label: 'In progress', category: 'started',   color: 'amber'   },
    { key: 'in_review',   label: 'In review',   category: 'started',   color: 'violet'  },
    { key: 'blocked',     label: 'Blocked',     category: 'started',   color: 'rose'    },
    { key: 'done',        label: 'Done',        category: 'completed', color: 'emerald' },
    { key: 'cancelled',   label: 'Cancelled',   category: 'cancelled', color: 'neutral' }
  ],
  task_priorities: [
    { key: 'p0', label: 'Urgent', color: 'rose'   },
    { key: 'p1', label: 'High',   color: 'orange' },
    { key: 'p2', label: 'Normal', color: 'slate'  },
    { key: 'p3', label: 'Low',    color: 'neutral'}
  ],
  task_labels: [],
  task_sla_tiers: [],
  task_event_rules: [],
  task_default_view: 'list',

  // Receipt approval workflow (v2)
  receipt_intake_team_id: null,
  receipt_intake_non_online_team_id: null,
  receipt_intake_teams_by_category: {},
  receipt_final_status_label: 'Completed',
  feature_flags: {
    receipts_approval_v2: false
  }
}

const AppConfigCtx = createContext({ config: DEFAULTS, loading: false, reload: () => {}, update: async () => {} })

// Merge-strategy: scalar keys fall back to DEFAULTS; object maps deep-merge; arrays replace entirely
// (so admins can clear a seeded list to empty without it coming back).
function mergeConfig(cfg) {
  const next = { ...DEFAULTS, ...(cfg || {}) }
  next.lead_stage_probabilities = {
    ...DEFAULTS.lead_stage_probabilities,
    ...((cfg && cfg.lead_stage_probabilities) || {})
  }
  next.review_tier_cadence_months = {
    ...DEFAULTS.review_tier_cadence_months,
    ...((cfg && cfg.review_tier_cadence_months) || {})
  }
  for (const k of ['task_statuses', 'task_priorities']) {
    if (!Array.isArray(next[k]) || !next[k].length) next[k] = DEFAULTS[k]
  }
  for (const k of ['task_labels', 'task_sla_tiers', 'task_event_rules']) {
    if (!Array.isArray(next[k])) next[k] = DEFAULTS[k]
  }
  if (!next.task_default_view) next.task_default_view = DEFAULTS.task_default_view
  next.feature_flags = {
    ...DEFAULTS.feature_flags,
    ...((cfg && cfg.feature_flags && typeof cfg.feature_flags === 'object') ? cfg.feature_flags : {})
  }
  if (next.receipt_intake_non_online_team_id == null) next.receipt_intake_non_online_team_id = DEFAULTS.receipt_intake_non_online_team_id
  if (!next.receipt_final_status_label) next.receipt_final_status_label = DEFAULTS.receipt_final_status_label
  next.receipt_intake_teams_by_category = {
    ...(DEFAULTS.receipt_intake_teams_by_category || {}),
    ...((cfg && cfg.receipt_intake_teams_by_category && typeof cfg.receipt_intake_teams_by_category === 'object')
      ? cfg.receipt_intake_teams_by_category
      : {})
  }
  return next
}

export function AppConfigProvider({ children }) {
  const { token } = useAuth() || {}
  const [config, setConfig] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const cfg = await api.getAppConfig(token)
      setConfig(mergeConfig(cfg))
    } catch (err) {
      // Silently fall back to defaults so Leads/Portfolio pages still work.
      console.warn('AppConfig load failed, using defaults:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { reload() }, [reload])

  const update = useCallback(async (patch) => {
    if (!token) throw new Error('Not authenticated')
    const next = await api.updateAppConfig(token, patch)
    setConfig(mergeConfig(next))
    return next
  }, [token])

  const value = useMemo(() => ({ config, loading, reload, update }), [config, loading, reload, update])
  return <AppConfigCtx.Provider value={value}>{children}</AppConfigCtx.Provider>
}

export function useAppConfig() {
  const ctx = useContext(AppConfigCtx)
  return ctx?.config || DEFAULTS
}

export function useAppConfigActions() {
  const ctx = useContext(AppConfigCtx)
  return { reload: ctx?.reload || (() => {}), update: ctx?.update || (async () => {}), loading: !!ctx?.loading }
}

export const APP_CONFIG_DEFAULTS = DEFAULTS
