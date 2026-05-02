import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar, TopHeader } from './create-receipt'
import ReportIssueModal from './ReportIssueModal'
import ChangePasswordModal from './ChangePasswordModal'
import ProfileModal from './ProfileModal'
import HandoffBanner from './HandoffBanner'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
export default function DashboardLayout() {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0)
  const [tasksReminderCount, setTasksReminderCount] = useState(0)
  const mainRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Load pending issues count for admin
  useEffect(() => {
    if (user?.role === 'admin' && token) {
      const loadPendingIssues = async () => {
        try {
          const result = await api.listIssues(token, { page: '1', size: '1000', status: 'all' })
          const issues = Array.isArray(result.items) ? result.items : []
          const pending = issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length
          setPendingIssuesCount(pending)
        } catch (err) {
          console.error('Failed to load pending issues:', err)
        }
      }
      loadPendingIssues()
      const interval = setInterval(loadPendingIssues, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.role, token])

  // Load overdue + due-today task count for Tasks nav badge via unified stats.
  useEffect(() => {
    if (!token) return
    const loadTasksReminderCount = async () => {
      try {
        const stats = await api.getTasksStats(token)
        setTasksReminderCount((stats?.overdue || 0) + (stats?.due_today || 0))
      } catch {
        try {
          const [overdueRes, dueTodayRes] = await Promise.all([
            api.listTasks(token, { due: 'overdue', limit: '1', page: '1' }),
            api.listTasks(token, { due: 'today', limit: '1', page: '1' })
          ])
          const overdueTotal = overdueRes.total ?? (overdueRes.items?.length ?? 0)
          const dueTodayTotal = dueTodayRes.total ?? (dueTodayRes.items?.length ?? 0)
          setTasksReminderCount(overdueTotal + dueTodayTotal)
        } catch {
          setTasksReminderCount(0)
        }
      }
    }
    loadTasksReminderCount()
    const interval = setInterval(loadTasksReminderCount, 60000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <>
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)] transition-colors duration-200">
        <Sidebar
          userRole={user?.role}
          empCode={user?.emp_code}
          pendingIssuesCount={pendingIssuesCount}
          tasksReminderCount={tasksReminderCount}
          mobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <TopHeader
            isAdmin={user?.role === 'admin'}
            isManager={user?.role === 'manager'}
            userName={user?.name ?? user?.emp_code}
            userEmail={user?.email}
            userBranch={user?.branch}
            userEmpCode={user?.emp_code}
            onReportIssue={() => setIsReportIssueModalOpen(true)}
            onProfileClick={() => setIsProfileModalOpen(true)}
            onLogout={handleLogout}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />

          {/*
            Page gutters live here only (max-w-7xl + padding). Child routes should use w-full min-w-0
            and avoid stacking extra asymmetric horizontal padding.
          */}
          <main ref={mainRef} className="flex-1 min-h-0 overflow-auto bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)]">
            <HandoffBanner />
            <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 min-w-0 pb-[max(12px,env(safe-area-inset-bottom))]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <ReportIssueModal
        isOpen={isReportIssueModalOpen}
        onClose={() => setIsReportIssueModalOpen(false)}
      />
      <ChangePasswordModal isOpen={!!user?.must_change_password} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  )
}
