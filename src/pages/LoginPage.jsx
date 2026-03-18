import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import DarkModeToggle from '../components/DarkModeToggle'
import { Card, Button, Input } from '../components/ui'
import { FiUser, FiLock, FiLogIn, FiAlertCircle, FiShield } from 'react-icons/fi'

export default function LoginPage() {
  const { login } = useAuth()
  const [emp, setEmp] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
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
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md">
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
            <div>
              <Input
                label="Password"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Enter your password"
                required
              />
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
