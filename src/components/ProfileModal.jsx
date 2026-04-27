import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { FiUser, FiMail, FiPhone, FiLock, FiX, FiAlertCircle } from 'react-icons/fi'
import { useEscapeClose } from '../hooks/useEscapeClose'

export default function ProfileModal({ isOpen, onClose }) {
  const { token, user, refreshUser, impersonator, impersonateAs, endImpersonation } = useAuth()
  useEscapeClose(isOpen, onClose)
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [impEmpCode, setImpEmpCode] = useState('')
  const [impError, setImpError] = useState('')
  const [impLoading, setImpLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      setEmail(user.email ?? '')
      setMobile(user.mobile ?? '')
      setProfileError('')
      setProfileSuccess('')
      setPasswordError('')
      setPasswordSuccess('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setImpEmpCode('')
      setImpError('')
    }
  }, [isOpen, user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    if (!token) return
    setProfileLoading(true)
    try {
      await api.updateMyProfile(token, { email: email.trim() || null, mobile: mobile.trim() || null })
      await refreshUser()
      setProfileSuccess('Profile updated.')
    } catch (err) {
      setProfileError(err.detail || err.message || 'Failed to update profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters and include uppercase, lowercase and a number.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    if (!token || !user?.id) return
    setPasswordLoading(true)
    try {
      await api.changePassword(token, user.id, newPassword)
      await refreshUser()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Password updated.')
    } catch (err) {
      setPasswordError(err.detail || err.message || 'Failed to update password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleImpersonateSubmit = async (e) => {
    e.preventDefault()
    setImpError('')
    if (!token || !user || user.role !== 'admin') {
      setImpError('Only admins can impersonate other users.')
      return
    }
    const trimmed = impEmpCode.trim()
    if (!trimmed) {
      setImpError('Please enter an employee code.')
      return
    }
    setImpLoading(true)
    try {
      await impersonateAs(trimmed)
      onClose()
    } catch (err) {
      setImpError(err.detail || err.message || 'Failed to impersonate user.')
    } finally {
      setImpLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                <FiUser className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-dark-400"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Profile: email & phone */}
          <form onSubmit={handleProfileSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Phone number</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-500" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Phone number"
                />
              </div>
            </div>
            {profileError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <FiAlertCircle className="flex-shrink-0" />
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{profileSuccess}</p>
            )}
            <button
              type="submit"
              disabled={profileLoading}
              className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 font-medium disabled:opacity-50"
            >
              {profileLoading ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          {/* Change password */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FiLock className="h-4 w-4" />
              Change password
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="At least 8 characters (uppercase, lowercase, number)"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <FiAlertCircle className="flex-shrink-0" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>
              )}
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-gray-700 dark:bg-dark-600 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 dark:hover:bg-dark-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 font-medium disabled:opacity-50"
              >
                {passwordLoading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>

          {/* Admin: login as another employee */}
          {user?.role === 'admin' && (
            <div className="border-t border-gray-200 dark:border-dark-700 pt-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <FiUser className="h-4 w-4" />
                Admin tools: Login as employee
              </h3>
              {impersonator && (
                <p className="mb-3 text-xs text-yellow-700 dark:text-yellow-300">
                  You are currently logged in as <span className="font-semibold">{user?.emp_code}</span>.
                  {' '}Original admin: <span className="font-semibold">{impersonator.user?.emp_code}</span>.
                </p>
              )}
              <form onSubmit={handleImpersonateSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                    Employee code to login as
                  </label>
                  <input
                    type="text"
                    value={impEmpCode}
                    onChange={(e) => setImpEmpCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g. ECS123"
                  />
                </div>
                {impError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    <FiAlertCircle className="flex-shrink-0" />
                    {impError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={impLoading}
                    className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 font-medium disabled:opacity-50 text-sm"
                  >
                    {impLoading ? 'Logging in…' : 'Login as employee'}
                  </button>
                  {impersonator && (
                    <button
                      type="button"
                      onClick={endImpersonation}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      Return to admin
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-dark-400">
                  This will switch your session to the selected employee without needing their password, so you can reproduce and fix issues. All actions will be audited as performed by that employee.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
