import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import DarkModeToggle from '../components/DarkModeToggle'
import { Card, Button, Input } from '../components/ui'
import { FiUser, FiLock, FiLogIn, FiAlertCircle, FiShield, FiEye, FiEyeOff } from 'react-icons/fi'

export default function LoginPage() {
  const { login } = useAuth()
  const [emp, setEmp] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await login(emp, pass)
      navigate('/dashboard')
    } catch (ex) {
      setErr(ex.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas)] flex items-center justify-center p-4 pb-safe pt-safe transition-colors duration-200">
      <div className="w-full min-w-0 max-w-md">
        <div className="flex justify-end mb-4">
          <DarkModeToggle />
        </div>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={80} />
          </div>
          <h1 className="text-headline font-bold text-[var(--text)] mb-2">ECS Receipt Portal</h1>
          <p className="text-body text-[var(--text-muted)]">Sign in to your account to continue</p>
        </div>
        <Card padding="lg" hover={false} className="shadow-lg">
          <form onSubmit={submit} className="space-y-6">
            <Input
              label="Employee Code"
              value={emp}
              onChange={(e) => setEmp(e.target.value)}
              placeholder="e.g., ADMIN or ECS497"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-label text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-input border bg-[var(--card-bg-opaque)] px-4 py-2.5 pr-11 text-body text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--placeholder)] border-[var(--stroke)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {err && (
              <div className="rounded-card border border-[var(--error)]/30 bg-[var(--error-muted)] px-4 py-3 flex items-center text-[var(--error)]">
                <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                {err}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full" icon={loading ? <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <FiLogIn className="h-5 w-5" />}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-[var(--stroke)]">
            <div className="text-caption text-[var(--text-muted)]">
              <div className="flex items-center mb-2">
                <FiShield className="w-4 h-4 mr-2" />
                <span className="font-medium">Default Credentials:</span>
              </div>
              <div className="space-y-1 text-small">
                <div>• <strong>Admin:</strong> emp_code=ADMIN, password=password123</div>
                <div>• <strong>Employee:</strong> emp_code=ECS1591, password=password123</div>
              </div>
            </div>
          </div>
        </Card>
        <div className="text-center mt-8 text-small text-[var(--text-muted)]">
          <p>&copy; 2024 ECS Financial Services. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
