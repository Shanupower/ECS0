import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import CSVExport from '../components/CSVExport'
import { 
  FiTrendingUp, 
  FiFileText, 
  FiCalendar, 
  FiBarChart, 
  FiActivity,
  FiUsers,
  FiUser,
  FiRefreshCw,
  FiAlertCircle,
  FiMapPin,
  FiDollarSign,
  FiAward
} from 'react-icons/fi'

export default function DashboardPage() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [categoryStats, setCategoryStats] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [branchStats, setBranchStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const currentYear = new Date().getFullYear()
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`, // Default to current year
    to: `${currentYear}-12-31` // End of current year
  })

  const loadDashboardData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      // Load summary statistics from backend
      const summaryData = await api.statsSummary(token, {
        from: dateRange.from,
        to: dateRange.to
      })
      setSummary(summaryData)
      
      // Load category statistics
      const categoryData = await api.statsByCategory(token, {
        from: dateRange.from,
        to: dateRange.to
      })
      setCategoryStats(categoryData)
      
      // Load daily statistics
      const dailyData = await api.statsByDay(token, {
        from: dateRange.from,
        to: dateRange.to
      })
      setDailyStats(dailyData)
      
      // Load branch statistics if admin
      if (isAdmin) {
        const branchData = await api.getGlobalBranchStats(token)
        setBranchStats(branchData)
      } else if (user?.role === 'branch' && user?.branch_code) {
        // For branch users, get their branch stats
        const branchData = await api.getBranchStats(token, user.branch_code)
        setBranchStats(branchData)
      }
      // For regular employees, we don't load branch-specific stats
      
    } catch (err) {
      console.error('Dashboard load error:', err)
      if (err.response?.data?.detail) {
        setError(`Server error: ${err.response.data.detail}`)
      } else if (err.message) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to load dashboard data. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [token, dateRange])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const isAdmin = user?.role === 'admin'

  const calculateCommission = (amount) => {
    return amount * 0.01 // 1% commission
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-dark-300 mt-1">Overview of your financial transactions</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 transition-colors duration-200"
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Date Range Selector */}
      <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="flex items-center mb-4">
          <FiCalendar className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 text-gray-500 dark:text-dark-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-400 mr-3"></div>
            Loading dashboard data...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{summary.total_receipts || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    {isAdmin ? 'All branches' : 'Your branch'}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Investments</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_investments || 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Investment amount
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg sm:text-xl font-bold">₹</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Customers</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{summary.total_customers || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Active customers
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Commission Earned</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(calculateCommission(summary.total_investments || 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    1% of investments
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center mb-6">
                <FiBarChart className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">By Category</h3>
              </div>
              {categoryStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryStats}>
                    <XAxis dataKey="category" stroke="currentColor" className="text-gray-600 dark:text-dark-400" />
                    <YAxis stroke="currentColor" className="text-gray-600 dark:text-dark-400" />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Category: ${label}`}
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity, 1)',
                        border: '1px solid var(--tw-border-opacity, 1)',
                        borderRadius: '0.5rem',
                        color: 'var(--tw-text-opacity, 1)'
                      }}
                    />
                    <Bar dataKey="amount" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                  <FiBarChart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                  <p>No category data available</p>
                </div>
              )}
            </div>

            {/* Daily Timeline */}
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center mb-6">
                <FiActivity className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Timeline</h3>
              </div>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="currentColor" 
                      className="text-gray-600 dark:text-dark-400"
                    />
                    <YAxis stroke="currentColor" className="text-gray-600 dark:text-dark-400" />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity, 1)',
                        border: '1px solid var(--tw-border-opacity, 1)',
                        borderRadius: '0.5rem',
                        color: 'var(--tw-text-opacity, 1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                  <FiActivity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                  <p>No daily data available</p>
                </div>
              )}
            </div>
          </div>

          {/* CSV Export Section - Admin Only */}
          {isAdmin && <CSVExport token={token} user={user} />}

          {/* Branch Performance Section */}
          {branchStats && (
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center mb-6">
                <FiMapPin className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isAdmin ? 'Branch Performance Overview' : `${user?.branch || 'Your Branch'} Performance`}
                </h3>
              </div>
              
              {isAdmin ? (
                // Admin view - show all branches
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branchStats.branches && branchStats.branches.slice(0, 6).map((branch, index) => (
                    <div key={branch.branch_code} className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">#{index + 1}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{branch.branch_name}</div>
                            <div className="text-xs text-gray-500 dark:text-dark-400">{branch.branch_code}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-dark-400">Investments:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(branch.total_investments || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-dark-400">Receipts:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{branch.total_receipts || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-dark-400">Commission:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(calculateCommission(branch.total_investments || 0))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Employee view - show their branch stats
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Investments</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(branchStats.total_investments || 0)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {branchStats.total_receipts || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Users</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {branchStats.total_users || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Commission Earned</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(calculateCommission(branchStats.total_investments || 0))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
