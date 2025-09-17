import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiTrendingUp, 
  FiFileText, 
  FiCalendar, 
  FiBarChart, 
  FiActivity,
  FiUsers,
  FiUser,
  FiRefreshCw,
  FiAlertCircle
} from 'react-icons/fi'

export default function DashboardPage() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [categoryStats, setCategoryStats] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '2025-09-01', // Default to September 2025 where test data exists
    to: '2025-12-31' // End of 2025
  })

  const loadDashboardData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const query = { 
        from: dateRange.from, 
        to: dateRange.to,
        size: 1000 // Get all receipts for the date range
      }
      
      // Use the same API approach as TransactionsPage
      let result
      if (!isAdmin && user?.emp_code) {
        // For employees, always use their own emp_code
        result = await api.getReceiptsByEmpCode(token, user.emp_code, query)
      } else {
        result = await api.listReceipts(token, query)
      }
      
      // Handle different response formats like TransactionsPage does
      let receipts = []
      if (Array.isArray(result)) {
        receipts = result
      } else if (result.items && Array.isArray(result.items)) {
        receipts = result.items
      } else if (result.data && Array.isArray(result.data)) {
        receipts = result.data
      }
      
      // Process receipts to generate dashboard statistics
      const stats = processReceiptsForDashboard(receipts)
      setSummary(stats.summary)
      setCategoryStats(stats.categoryStats)
      setDailyStats(stats.dailyStats)
      
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
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

  // Function to process receipts and generate dashboard statistics
  const processReceiptsForDashboard = (receipts) => {
    // Filter out deleted receipts
    const activeReceipts = receipts.filter(receipt => !receipt.deleted_at && !receipt.is_deleted)
    
    // Calculate summary statistics
    const totalReceipts = activeReceipts.length
    const totalAmount = activeReceipts.reduce((sum, receipt) => {
      const amount = parseFloat(receipt.investment_amount || receipt.investmentAmount || 0)
      return sum + amount
    }, 0)
    
    // Group by category
    const categoryMap = new Map()
    activeReceipts.forEach(receipt => {
      const category = receipt.product_category || receipt.issuer_category || 'Other'
      const amount = parseFloat(receipt.investment_amount || receipt.investmentAmount || 0)
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + amount)
      } else {
        categoryMap.set(category, amount)
      }
    })
    
    const categoryStats = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category: category || 'Other',
      amount: amount
    }))
    
    // Group by day
    const dayMap = new Map()
    activeReceipts.forEach(receipt => {
      const date = new Date(receipt.date).toISOString().split('T')[0] // Get YYYY-MM-DD format
      const amount = parseFloat(receipt.investment_amount || receipt.investmentAmount || 0)
      
      if (dayMap.has(date)) {
        dayMap.set(date, dayMap.get(date) + amount)
      } else {
        dayMap.set(date, amount)
      }
    })
    
    const dailyStats = Array.from(dayMap.entries()).map(([date, amount]) => ({
      date: date,
      amount: amount
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // Group by employee (for admin view)
    const employeeMap = new Map()
    activeReceipts.forEach(receipt => {
      const empCode = receipt.emp_code || receipt.empCode
      const empName = receipt.employee_name || receipt.employeeName
      const amount = parseFloat(receipt.investment_amount || receipt.investmentAmount || 0)
      
      if (employeeMap.has(empCode)) {
        const emp = employeeMap.get(empCode)
        emp.receiptCount += 1
        emp.totalAmount += amount
      } else {
        employeeMap.set(empCode, {
          empCode: empCode,
          employeeName: empName,
          receiptCount: 1,
          totalAmount: amount
        })
      }
    })
    
    const byEmployee = Array.from(employeeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    
    return {
      summary: {
        totalReceipts,
        totalAmount,
        commissionsTotal: totalAmount * 0.01, // 1% commission (adjust as needed)
        byEmployee
      },
      categoryStats,
      dailyStats
    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{summary.totalReceipts || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    {isAdmin ? 'All employees' : 'Your receipts'}
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
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Collections</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalAmount || 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Investment amount
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">₹</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Average per Receipt</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalAmount && summary.totalReceipts ? 
                      summary.totalAmount / summary.totalReceipts : 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                    Per transaction
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
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

          {/* Additional Stats */}
          {summary.byEmployee && summary.byEmployee.length > 0 && isAdmin && (
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center mb-6">
                <FiUsers className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">By Employee</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">Employee</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">Receipts</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">Amount</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">Average</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                    {summary.byEmployee.map((emp, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                              <FiUser className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.employeeName}</div>
                              <div className="text-sm text-gray-500 dark:text-dark-400">{emp.empCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{emp.receiptCount || 0}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(emp.totalAmount || 0)}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(emp.totalAmount && emp.receiptCount ? 
                            emp.totalAmount / emp.receiptCount : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
