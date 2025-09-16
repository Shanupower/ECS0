import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiFileText, 
  FiCalendar, 
  FiBarChart, 
  FiActivity,
  FiUsers,
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
    from: new Date().toISOString().slice(0, 7) + '-01', // First day of current month
    to: new Date().toISOString().slice(0, 10) // Today
  })

  const loadDashboardData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const query = { from: dateRange.from, to: dateRange.to }
      
      // For employees, add their emp_code to get their specific stats
      if (!isAdmin && user?.emp_code) {
        query.emp_code = user.emp_code
      }
      
      // Load summary stats (includes employee-specific data if not admin)
      const summaryData = await api.statsSummary(token, query)
      setSummary(summaryData)
      
      // Load category breakdown
      const categoryData = await api.statsByCategory(token, query)
      if (categoryData.items && Array.isArray(categoryData.items)) {
        setCategoryStats(categoryData.items)
      } else if (Array.isArray(categoryData)) {
        setCategoryStats(categoryData)
      } else {
        setCategoryStats([])
      }
      
      // Load daily timeline
      const dailyData = await api.statsByDay(token, query)
      if (dailyData.items && Array.isArray(dailyData.items)) {
        setDailyStats(dailyData.items)
      } else if (Array.isArray(dailyData)) {
        setDailyStats(dailyData)
      } else {
        setDailyStats([])
      }
      
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your financial transactions</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <FiCalendar className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
        </div>
        <div className="flex gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-3"></div>
            Loading dashboard data...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Total Receipts</div>
                  <div className="text-3xl font-bold text-gray-900">{summary.totalReceipts || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isAdmin ? 'All employees' : 'Your receipts'}
                  </div>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FiFileText className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Total Collections</div>
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalAmount || 0)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Investment amount
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiDollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Average per Receipt</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(summary.totalAmount && summary.totalReceipts ? 
                      summary.totalAmount / summary.totalReceipts : 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Per transaction
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                <FiBarChart className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">By Category</h3>
              </div>
              {categoryStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryStats}>
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Category: ${label}`}
                    />
                    <Bar dataKey="amount" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiBarChart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No category data available</p>
                </div>
              )}
            </div>

            {/* Daily Timeline */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                <FiActivity className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Daily Timeline</h3>
              </div>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
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
                <div className="text-center py-12 text-gray-500">
                  <FiActivity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No daily data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Stats */}
          {summary.byEmployee && summary.byEmployee.length > 0 && isAdmin && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                <FiUsers className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">By Employee</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.byEmployee.map((emp, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                              <FiUser className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{emp.employeeName}</div>
                              <div className="text-sm text-gray-500">{emp.empCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.receiptCount || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(emp.totalAmount || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
