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
  const [includePending, setIncludePending] = useState(false)
  const [viewMode, setViewMode] = useState('personal') // 'personal', 'branch', 'all' for admins

  const loadDashboardData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      // Determine query params based on view mode for admins
      let queryParams = {
        from: dateRange.from,
        to: dateRange.to,
        includePending: includePending ? '1' : '0'
      }
      
      // For admins, adjust query based on view mode
      if (isAdmin) {
        if (viewMode === 'personal') {
          // Admin viewing personal data - filter by their emp_code
          if (user?.emp_code) {
            queryParams.emp_code = user.emp_code
          }
        } else if (viewMode === 'branch') {
          // Admin viewing branch data - pass viewMode to backend
          queryParams.viewMode = 'branch'
        } else {
          // All branches view
          queryParams.viewMode = 'all'
        }
      }
      
      // Load summary statistics from backend
      const summaryData = await api.statsSummary(token, queryParams)
      setSummary(summaryData)
      
      // Load category statistics
      const categoryData = await api.statsByCategory(token, queryParams)
      setCategoryStats(categoryData)
      
      // Load daily statistics
      const dailyData = await api.statsByDay(token, queryParams)
      setDailyStats(dailyData)
      
      // Load branch statistics if admin viewing all branches
      if (isAdmin && viewMode === 'all') {
        const branchData = await api.getGlobalBranchStats(token, {
          from: dateRange.from,
          to: dateRange.to,
          includePending: includePending ? '1' : '0'
        })
        setBranchStats(branchData)
      } else {
        setBranchStats(null)
      }
      
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
  }, [token, dateRange, includePending, viewMode])

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
  const isEmployee = user?.role === 'employee'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEmployee ? 'My Performance' : 'Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-dark-300 mt-1">
            {isEmployee ? 'Track your personal performance metrics' : 'Overview of financial transactions'}
          </p>
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
      
      {/* Date Range Selector and Filters */}
      <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="flex items-center mb-4">
          <FiCalendar className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
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
          <div className="flex items-end">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={includePending}
                  onChange={e => setIncludePending(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                  includePending 
                    ? 'bg-red-600 dark:bg-red-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    includePending ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Include Pending
              </span>
            </label>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">View Mode</label>
            <div className="flex gap-2">
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value="personal"
                  checked={viewMode === 'personal'}
                  onChange={e => setViewMode(e.target.value)}
                  className="sr-only"
                />
                <div className={`px-4 py-2.5 text-sm font-medium text-center rounded-lg border-2 transition-all duration-200 ${
                  viewMode === 'personal'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-dark-200 hover:border-gray-400 dark:hover:border-gray-500'
                }`}>
                  Personal Data
                </div>
              </label>
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value="branch"
                  checked={viewMode === 'branch'}
                  onChange={e => setViewMode(e.target.value)}
                  className="sr-only"
                />
                <div className={`px-4 py-2.5 text-sm font-medium text-center rounded-lg border-2 transition-all duration-200 ${
                  viewMode === 'branch'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-dark-200 hover:border-gray-400 dark:hover:border-gray-500'
                }`}>
                  Branch Data
                </div>
              </label>
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value="all"
                  checked={viewMode === 'all'}
                  onChange={e => setViewMode(e.target.value)}
                  className="sr-only"
                />
                <div className={`px-4 py-2.5 text-sm font-medium text-center rounded-lg border-2 transition-all duration-200 ${
                  viewMode === 'all'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-dark-200 hover:border-gray-400 dark:hover:border-gray-500'
                }`}>
                  All Branches
                </div>
              </label>
            </div>
          </div>
        )}
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin && summary.service_income_earned !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{summary.total_receipts || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    {isAdmin 
                      ? (viewMode === 'personal' ? 'Personal' : viewMode === 'branch' ? 'Your branch' : 'All branches')
                      : 'Your branch'}
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
                    Investment amount in the selected period and view
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg sm:text-xl font-bold"> </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Customers</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{summary.total_customers || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Customers in the selected scope (personal / branch / all)
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
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">
                    Collection/Credit Earned
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.collection_credit_earned || summary.commissions_total || 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Sum of CC on all qualifying receipts
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            
            {isAdmin && summary.service_income_earned !== undefined && (
              <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">
                      Service Income Earned
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(summary.service_income_earned || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                      Admin-only SI based on scheme percentages
                    </div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <FiBarChart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">By Category</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Investment breakdown</p>
                  </div>
                </div>
              </div>
              {categoryStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={categoryStats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorCategory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Category: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#colorCategory)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                    <FiActivity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Timeline</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Investment trends</p>
                  </div>
                </div>
              </div>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart 
                    data={dailyStats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="#9CA3AF"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                      cursor={{ stroke: '#06B6D4', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#06B6D4" 
                      strokeWidth={3}
                      dot={{ fill: '#06B6D4', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#0891B2' }}
                      fillOpacity={1}
                      fill="url(#colorTimeline)"
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

          {/* Branch Performance Section - Only for Admin viewing all branches */}
          {branchStats && isAdmin && viewMode === 'all' && (
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center mb-6">
                <FiMapPin className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Branch Performance Overview
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchStats.branches && branchStats.branches.slice(0, 6).map((branch, index) => (
                    <div key={branch.branch_code || branch.branch || index} className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">#{index + 1}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{branch.branch || branch.branch_name || 'Unknown Branch'}</div>
                            <div className="text-xs text-gray-500 dark:text-dark-400">{branch.branch_code || ''}</div>
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
                          <span className="text-gray-500 dark:text-dark-400">Collection/Credit:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(branch.commissions || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
