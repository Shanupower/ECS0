import React, { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Logo from './Logo'
import DarkModeToggle from './DarkModeToggle'
import ReportIssueModal from './ReportIssueModal'
import ChangePasswordModal from './ChangePasswordModal'
import ProfileModal from './ProfileModal'
import { 
  FiHome, 
  FiFileText, 
  FiClock, 
  FiUsers, 
  FiLogOut, 
  FiUser,
  FiShield,
  FiChevronDown,
  FiMenu,
  FiX,
  FiMapPin,
  FiBarChart,
  FiUserCheck,
  FiAlertTriangle,
  FiDatabase,
  FiCheckSquare,
  FiTarget,
  FiClipboard
} from 'react-icons/fi'

export default function Layout(){
  const { user, logout, token }=useAuth()
  const navigate=useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0)
  const [tasksReminderCount, setTasksReminderCount] = useState(0)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const dropdownRef = useRef(null)
  const mainRef = useRef(null)
  
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => setHeaderScrolled(el.scrollTop > 8)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  
  const handleLogout=()=>{logout();navigate('/login')}

  // Load pending issues count for admin
  useEffect(() => {
    if (user?.role === 'admin' && token) {
      const loadPendingIssues = async () => {
        try {
          const result = await api.listIssues(token, { page: '1', size: '1000', status: 'all' })
          const issues = Array.isArray(result.items) ? result.items : []
          const pending = issues.filter(i => i.status === 'open' || i.status === 'in_progress').length
          setPendingIssuesCount(pending)
        } catch (err) {
          console.error('Failed to load pending issues:', err)
        }
      }
      loadPendingIssues()
      // Refresh every 30 seconds
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
          api.listTasks(token, { due_from: today, due_to: today, status: 'pending,in_progress', limit: '1', page: '1' })
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  const isAdmin = user?.role === 'admin'
  const isBranchManager = user?.role === 'manager'
  
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: FiHome },
    { to: "/receipts", label: "Create Receipt", icon: FiFileText },
    { to: "/transactions", label: "Transaction History", icon: FiClock },
    { to: "/tasks", label: "Tasks", icon: FiCheckSquare },
    { to: "/leads", label: "Leads", icon: FiTarget },
    { to: "/portfolio-review", label: "Portfolio Review", icon: FiClipboard },
    { to: "/my-issues", label: "My Issues", icon: FiAlertTriangle },
    ...(isAdmin ? [
      { to: "/branches", label: "Branch Dashboard", icon: FiBarChart },
      { to: "/admin/branches", label: "Branch Management", icon: FiShield },
      { to: "/users", label: "User Management", icon: FiUsers },
      { to: "/schemes", label: "Scheme Management", icon: FiDatabase },
      { to: "/customers", label: "Customer Management", icon: FiUserCheck },
      { to: "/issues", label: "All Issues", icon: FiAlertTriangle }
    ] : []),
    ...(isBranchManager ? [
      { to: "/branches", label: "Branch Dashboard", icon: FiBarChart, disabled: true, comingSoon: true },
      { to: "/customers", label: "Client Management", icon: FiUserCheck }
    ] : []),
    ...(user?.role === 'employee' ? [
      { to: "/customers", label: "Client Management", icon: FiUserCheck }
    ] : [])
  ]
  
  return (
    <>
      <div className="flex h-screen min-h-0 overflow-hidden bg-[var(--canvas)] transition-colors duration-200">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar: glass treatment + theme tokens */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col flex-shrink-0
        h-screen max-h-screen lg:max-h-full
        bg-[var(--card-bg)] backdrop-blur-[20px] border-r border-[var(--stroke)] shadow-card
        transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="flex-shrink-0 p-6 border-b border-[var(--stroke)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size={48} />
              <div>
                <h1 className="text-xl font-bold text-[var(--text)]">ECS Receipts</h1>
                <p className="text-sm text-[var(--text-muted)]">Financial Management Portal</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-card hover:bg-[var(--card-hover)] text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              aria-label="Close menu"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isDisabled = item.disabled
            const hasComingSoon = item.comingSoon
            
            if (isDisabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center justify-between px-4 py-3 text-[var(--text-muted)] rounded-card cursor-not-allowed opacity-60"
                  title="Coming Soon"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {hasComingSoon && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-[var(--warn-muted)] text-[var(--warn)] rounded-pill">
                      Coming Soon
                    </span>
                  )}
                </div>
              )
            }
            
            const showBadge = item.to === '/issues' && isAdmin && pendingIssuesCount > 0
            const showTasksBadge = item.to === '/tasks' && tasksReminderCount > 0
            
            return (
              <Link 
                key={item.to}
                className="flex items-center justify-between px-4 py-3 rounded-card transition-colors duration-200 group text-[var(--text-primary)] hover:bg-[var(--link-hover-bg)] hover:text-[var(--link-hover)]"
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {showBadge && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[var(--error)] rounded-pill">
                    {pendingIssuesCount > 99 ? '99+' : pendingIssuesCount}
                  </span>
                )}
                {showTasksBadge && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[var(--error)] rounded-pill">
                    {tasksReminderCount > 99 ? '99+' : tasksReminderCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>
      
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header: translucent on scroll */}
        <header className={`sticky top-0 z-50 px-4 lg:px-6 py-3 transition-all duration-200 ${
          headerScrolled 
            ? 'bg-[var(--card-bg)]/80 backdrop-blur-[20px] border-b border-[var(--stroke)] shadow-sm' 
            : 'bg-transparent border-b border-transparent'
        }`}>
          <div className="flex justify-between items-center w-full h-16">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden flex-shrink-0 p-2 rounded-card hover:bg-[var(--card-hover)] text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                aria-label="Open menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-[var(--text)] leading-tight mb-0.5">
                    Welcome back,
                  </div>
                  <div className="text-sm font-normal text-[var(--text-muted)] break-words">
                    {user?.name || user?.emp_code}
                  </div>
                </div>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-medium bg-[var(--accent-muted)] text-[var(--accent)] flex-shrink-0">
                    <FiShield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
                {isBranchManager && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-medium bg-[var(--warn-muted)] text-[var(--warn)] flex-shrink-0">
                    <FiMapPin className="w-3 h-3 mr-1" />
                    Manager
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={() => setIsReportIssueModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-[var(--warn)] hover:bg-[var(--warn-muted)] rounded-card transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                title="Report an Issue"
              >
                <FiAlertTriangle size={16} />
                <span className="hidden sm:inline">Report Issue</span>
              </button>
              
              <DarkModeToggle className="hidden sm:block" />
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-card hover:bg-[var(--card-hover)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
                >
                  <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="text-left hidden sm:block min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text)] truncate max-w-[120px]">
                      {user?.name || user?.emp_code}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {user?.emp_code}
                    </p>
                  </div>
                  <FiChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] backdrop-blur-[20px] rounded-card shadow-lg border border-[var(--stroke)] py-1 z-50 animate-slideDown">
                    <div className="px-4 py-2 border-b border-[var(--stroke)]">
                      <p className="text-sm font-medium text-[var(--text)]">{user?.name || user?.emp_code}</p>
                      <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                      {user?.branch && (
                        <p className="text-xs text-[var(--text-muted)]">{user?.branch}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setIsDropdownOpen(false); setIsProfileModalOpen(true) }}
                      className="w-full flex items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--link-hover-bg)] hover:text-[var(--link-hover)] transition-colors duration-200"
                    >
                      <FiUser className="w-4 h-4 mr-3" />
                      Profile
                    </button>
                    <div className="px-4 py-2 border-b border-[var(--stroke)] sm:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text)]">Dark Mode</span>
                        <DarkModeToggle />
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--link-hover-bg)] hover:text-[var(--link-hover)] transition-colors duration-200"
                    >
                      <FiLogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main ref={mainRef} className="flex-1 min-h-0 overflow-auto bg-[var(--canvas)]">
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            <Outlet/>
          </div>
        </main>
      </div>
      </div>
      
      {/* Report Issue Modal */}
      <ReportIssueModal 
        isOpen={isReportIssueModalOpen} 
        onClose={() => setIsReportIssueModalOpen(false)} 
      />
      {/* Change password popup when user still has default password */}
      <ChangePasswordModal isOpen={!!user?.must_change_password} />
      {/* Profile modal (email, phone, password) */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  )
}
