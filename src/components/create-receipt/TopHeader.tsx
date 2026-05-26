import React, { useState, useRef, useEffect } from 'react'
import { Shield, AlertCircle, User, LogOut, MapPin, Menu } from 'lucide-react'
import DarkModeToggle from '../DarkModeToggle'
import { GlobalSearch } from './GlobalSearch'
import NotificationBell from '../NotificationBell'

interface TopHeaderProps {
  isAdmin?: boolean
  isManager?: boolean
  userName?: string
  userEmail?: string
  userBranch?: string
  userEmpCode?: string
  onReportIssue?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
  /** Opens the sidebar on small viewports; omitted = no menu control (desktop-only layouts). */
  onMenuClick?: () => void
}

export function TopHeader({
  isAdmin,
  isManager,
  userName,
  userEmail,
  userBranch,
  userEmpCode,
  onReportIssue,
  onProfileClick,
  onLogout,
  onMenuClick,
}: TopHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="relative z-40 flex-shrink-0 min-h-14 w-full min-w-0 px-2 sm:px-4 lg:px-6 py-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-card)]/80 dark:bg-[var(--dashboard-card)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5 shrink-0">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/50 hover:text-[var(--dashboard-text)] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      </div>
      <div className="min-w-0 max-w-md w-full justify-self-start">
        <GlobalSearch inputRef={searchRef} />
      </div>
      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0 min-w-0 justify-self-end">
        {isAdmin && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)] border border-[var(--dashboard-primary)]/30">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Mode</span>
          </span>
        )}
        {isManager && !isAdmin && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--warn-muted)] text-[var(--warn)] border border-[var(--warn)]/30">
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manager</span>
          </span>
        )}
        <button
          type="button"
          onClick={onReportIssue}
          className="inline-flex items-center gap-1.5 sm:gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-sm font-medium text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Report Issue</span>
        </button>
        <DarkModeToggle className="hidden sm:block flex-shrink-0" />
        <NotificationBell />
        <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-[var(--dashboard-border)]/50 transition-colors"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--dashboard-primary)]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--dashboard-primary)]" />
              </div>
              <div className="text-left hidden sm:block min-w-0">
                <p className="text-sm font-medium text-[var(--dashboard-text)] truncate max-w-[120px]">
                  {userName || userEmpCode}
                </p>
                <p className="text-xs text-[var(--dashboard-muted)] truncate">
                  {userEmpCode}
                </p>
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] shadow-lg py-1 z-50">
                <div className="px-4 py-3 border-b border-[var(--dashboard-border)]">
                  <p className="text-sm font-medium text-[var(--dashboard-text)] truncate">
                    {userName || userEmpCode}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-[var(--dashboard-muted)] truncate">{userEmail}</p>
                  )}
                  {userBranch && (
                    <p className="text-xs text-[var(--dashboard-muted)]">{userBranch}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); onProfileClick?.() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <div className="px-4 py-2 border-t border-[var(--dashboard-border)] sm:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--dashboard-text)]">Dark mode</span>
                    <DarkModeToggle />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); onLogout?.() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
      </div>
    </header>
  )
}
