import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar, TopHeader } from './create-receipt'
import ReportIssueModal from './ReportIssueModal'
import ChangePasswordModal from './ChangePasswordModal'
import ProfileModal from './ProfileModal'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { FiMenu } from 'react-icons/fi'

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

  // Load overdue + due-today task count for Tasks nav badge
  useEffect(() => {
    if (!token) return
    const loadTasksReminderCount = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const [overdueRes, dueTodayRes] = await Promise.all([
          api.listTasks(token, { overdue: '1', limit: '1', page: '1' }),
          api.listTasks(token, {
            due_from: today,
            due_to: today,
            status: 'pending,in_progress',
            limit: '1',
            page: '1',
          }),
        ])
        const overdueTotal = overdueRes.total ?? (overdueRes.items?.length ?? 0)
        const dueTodayTotal = dueTodayRes.total ?? (dueTodayRes.items?.length ?? 0)
        setTasksReminderCount(overdueTotal + dueTodayTotal)
      } catch {
        setTasksReminderCount(0)
      }
    }
    loadTasksReminderCount()
    const interval = setInterval(loadTasksReminderCount, 60000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <>
      <div className="flex h-screen min-h-0 overflow-hidden bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)] transition-colors duration-200">
        <Sidebar
          userRole={user?.role}
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
          />

          <main ref={mainRef} className="flex-1 min-h-0 overflow-auto bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)]">
            <div className="flex items-center gap-3 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:hidden border-b border-[var(--dashboard-border)] bg-[var(--dashboard-card)]">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/50"
                aria-label="Open menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-[var(--dashboard-text)] truncate">
                {user?.name || user?.emp_code}
              </span>
            </div>
            <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 min-w-0">
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
