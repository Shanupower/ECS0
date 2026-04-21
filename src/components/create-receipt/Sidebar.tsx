import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  History,
  Users,
  Target,
  ClipboardList,
  BarChart3,
  Building2,
  UserCog,
  Database,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../utils/cn'

const SIDEBAR_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

/** Build nav groups based on role. admin sees all; manager sees limited management; employee sees no management. */
function getNavGroups(role, pendingIssuesCount, tasksReminderCount) {
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isEmployee = role === 'employee'

  const main = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/receipts', label: 'Create Receipt', icon: FileText },
    { to: '/transactions', label: 'Transactions', icon: History },
  ]

  const crm = [
    { to: '/leads', label: 'Leads', icon: Target },
    ...(isManager || isEmployee ? [{ to: '/customers', label: 'Client Management', icon: Users }] : []),
    ...(isAdmin ? [{ to: '/customers', label: 'Customer Management', icon: Users }] : []),
  ]

  const operations = [
    { to: '/tasks', label: 'Tasks', icon: ClipboardList, badge: tasksReminderCount },
    ...(isAdmin || isManager ? [{ to: '/tasks/reports', label: 'Task Reports', icon: BarChart3 }] : []),
    { to: '/portfolio-review', label: 'Portfolio Review', icon: BarChart3 },
  ]

  const management = [
    ...(isAdmin ? [
      { to: '/branches', label: 'Branches', icon: Building2 },
      { to: '/users', label: 'User Management', icon: UserCog },
      { to: '/schemes', label: 'Scheme Management', icon: Database },
    ] : []),
    ...(isManager ? [{ to: '/branches', label: 'Branches', icon: Building2 }] : []),
  ]

  const support = [
    { to: '/my-issues', label: 'My Issues', icon: MessageSquare },
    ...(isAdmin ? [{ to: '/issues', label: 'All Issues', icon: AlertCircle, badge: pendingIssuesCount }] : []),
  ]

  return [
    { label: 'MAIN', items: main },
    { label: 'CRM', items: crm },
    { label: 'OPERATIONS', items: operations },
    { label: 'MANAGEMENT', items: management },
    { label: 'SUPPORT', items: support },
  ].filter((g) => g.items.length > 0)
}

export function Sidebar({
  userRole,
  pendingIssuesCount = 0,
  tasksReminderCount = 0,
  mobileOpen = false,
  onMobileClose,
  className,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navGroups = getNavGroups(userRole, pendingIssuesCount, tasksReminderCount)
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className={cn(
          'flex flex-col flex-shrink-0 h-full border-r border-[var(--dashboard-border)] bg-[var(--dashboard-card)] backdrop-blur-xl overflow-hidden z-50',
          'fixed lg:static inset-y-0 left-0 transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
        style={{ width }}
      >
        <div className="flex items-center justify-between flex-shrink-0 p-4 border-b border-[var(--dashboard-border)] min-h-[57px]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-semibold text-[var(--dashboard-text)] truncate"
              >
                ECS Receipts
              </motion.span>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors hidden lg:flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] lg:hidden"
                aria-label="Close menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.p
                    key={group.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  if (item.disabled) {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--dashboard-muted)] cursor-not-allowed opacity-70"
                          title="Coming Soon"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                            {!collapsed && (
                              <>
                                <span className="truncate">{item.label}</span>
                                {item.comingSoon && (
                                  <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-[var(--warn-muted)] text-[var(--warn)] rounded-md">
                                    Coming Soon
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  }
                  const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                  const Icon = item.icon
                  const badge = item.badge != null && item.badge > 0 ? item.badge : null
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-[var(--dashboard-primary)]/12 text-[var(--dashboard-primary)] dark:bg-[var(--dashboard-primary)]/20'
                            : 'text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 dark:hover:bg-[var(--dashboard-border)]/30'
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                        <AnimatePresence mode="wait">
                          {!collapsed && (
                            <motion.span
                              key="label"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="truncate flex-1"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {!collapsed && badge != null && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[var(--error)] rounded-full">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </motion.aside>
    </>
  )
}
