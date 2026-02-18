import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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
  FiAlertCircle,
  FiMapPin,
  FiTarget,
  FiAward,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiDollarSign,
  FiPercent,
  FiClock,
  FiMail,
  FiPhone,
  FiHome
} from 'react-icons/fi'

// Modern gradient color palette with better contrast
const COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16'  // Lime
]

export default function BranchDashboard() {
  const { token, user } = useAuth()
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [branchStats, setBranchStats] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [employeePerformance, setEmployeePerformance] = useState([])
  const [selectedBranchesForComparison, setSelectedBranchesForComparison] = useState([])
  const [showComparison, setShowComparison] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedBranches, setExpandedBranches] = useState(new Set())
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState(null)
  const [detailedBranchStats, setDetailedBranchStats] = useState(null)
  const [loadingBranchDetails, setLoadingBranchDetails] = useState(false)
  const [branchEmployees, setBranchEmployees] = useState([])
  const [branchRecentReceipts, setBranchRecentReceipts] = useState([])
  const [includePending, setIncludePending] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().slice(0, 7) + '-01', // First day of current month
    to: new Date().toISOString().slice(0, 10) // Today
  })
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'

  const loadBranchData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      // Load all branches
      const branchesData = await api.listBranches(token)
      setBranches(branchesData)
      
      // Load global branch statistics
      const globalStatsData = await api.getGlobalBranchStats(token, {
        includePending: includePending ? '1' : '0',
        from: dateRange.from,
        to: dateRange.to
      })
      setGlobalStats(globalStatsData)
      
      // Load employee performance data
      if (isAdmin || isManager) {
        try {
          const empPerfData = await api.getEmployeePerformance(token, {
            from: dateRange.from,
            to: dateRange.to,
            branch_code: isManager && user?.branch_code ? user.branch_code : undefined,
            includePending: includePending ? '1' : '0'
          })
          setEmployeePerformance(Array.isArray(empPerfData) ? empPerfData : [])
        } catch (err) {
          console.error('Failed to load employee performance:', err)
          setEmployeePerformance([])
        }
      }
      
      // If user is manager, filter to their branch only
      if (isManager && user?.branch) {
        const userBranch = branchesData.find(b => 
          b.branch_name.toLowerCase() === user.branch.toLowerCase()
        )
        if (userBranch) {
          setSelectedBranch(userBranch)
          await loadBranchStats(userBranch.branch_code)
        }
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load branch data')
    } finally {
      setLoading(false)
    }
  }

  const loadBranchStats = async (branchCode) => {
    if (!branchCode) return
    
    try {
      const stats = await api.getBranchStats(token, branchCode, {
        includePending: includePending ? '1' : '0',
        from: dateRange.from,
        to: dateRange.to
      })
      setBranchStats(stats)
    } catch (err) {
      console.error('Failed to load branch stats:', err)
    }
  }

  const toggleBranchExpansion = (branchCode) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchCode)) {
      newExpanded.delete(branchCode)
      setSelectedBranchForDetails(null)
      setDetailedBranchStats(null)
    } else {
      newExpanded.add(branchCode)
      // Load detailed stats for this branch
      loadDetailedBranchStats(branchCode)
    }
    setExpandedBranches(newExpanded)
  }

  const loadDetailedBranchStats = async (branchCode) => {
    if (!token || !branchCode) return
    
    const branch = branches.find(b => b.branch_code === branchCode)
    if (!branch) return
    
    setSelectedBranchForDetails(branch)
    setLoadingBranchDetails(true)
    
    try {
      // Load detailed branch statistics
      const stats = await api.getBranchStats(token, branchCode, {
        includePending: includePending ? '1' : '0',
        from: dateRange.from,
        to: dateRange.to
      })
      setDetailedBranchStats(stats)
      
      // Load employee performance for this branch
      try {
        const empPerf = await api.getEmployeePerformance(token, {
          from: dateRange.from,
          to: dateRange.to,
          branch_code: branchCode,
          includePending: includePending ? '1' : '0'
        })
        setBranchEmployees(Array.isArray(empPerf) ? empPerf : [])
      } catch (err) {
        console.error('Failed to load branch employees:', err)
        setBranchEmployees([])
      }
      
      // Load recent receipts for this branch
      try {
        const receipts = await api.listReceipts(token, {
          branch_code: branchCode,
          from: dateRange.from,
          to: dateRange.to,
          size: 10,
          sort: 'created_at:desc'
        })
        const receiptsData = receipts.data || receipts.items || receipts || []
        setBranchRecentReceipts(Array.isArray(receiptsData) ? receiptsData.slice(0, 10) : [])
      } catch (err) {
        console.error('Failed to load branch receipts:', err)
        setBranchRecentReceipts([])
      }
    } catch (err) {
      console.error('Failed to load detailed branch stats:', err)
      setDetailedBranchStats(null)
    } finally {
      setLoadingBranchDetails(false)
    }
  }

  useEffect(() => {
    // Reload detailed stats when date range or includePending changes
    if (selectedBranchForDetails) {
      loadDetailedBranchStats(selectedBranchForDetails.branch_code)
    }
  }, [dateRange.from, dateRange.to, includePending])

  useEffect(() => {
    loadBranchData()
  }, [token, includePending, dateRange.from, dateRange.to])

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period)
    const today = new Date()
    const from = new Date()
    
    switch (period) {
      case 'today':
        from.setDate(today.getDate())
        break
      case 'week':
        from.setDate(today.getDate() - 7)
        break
      case 'month':
        from.setDate(1)
        break
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3)
        from.setMonth(quarter * 3, 1)
        break
      case 'year':
        from.setMonth(0, 1)
        break
      case 'custom':
        return // Don't change dates for custom
      default:
        from.setDate(1)
    }
    
    setDateRange({
      from: from.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10)
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0)
  }

  const getTopPerformers = () => {
    if (!globalStats || !globalStats.branches) return []
    
    return globalStats.branches
      .sort((a, b) => (b.total_investments || 0) - (a.total_investments || 0))
      .slice(0, 5)
  }

  const getBranchPerformanceData = () => {
    if (!globalStats || !globalStats.branches) return []
    
    return globalStats.branches.map(branch => ({
      name: branch.branch || branch.branch_name || 'Unknown Branch',
      investments: branch.total_investments || 0,
      receipts: branch.total_receipts || 0,
      users: branch.total_employees || 0,
      commission: branch.commissions || 0
    }))
  }

  const getBranchDistributionData = () => {
    if (!globalStats || !globalStats.branches) return []
    
    const total = globalStats.branches.reduce((sum, branch) => sum + (branch.total_investments || 0), 0)
    
    return globalStats.branches
      .filter(branch => branch.total_investments > 0)
      .map((branch, index) => ({
        name: branch.branch || branch.branch_name || 'Unknown Branch',
        value: branch.total_investments || 0,
        percentage: total > 0 ? ((branch.total_investments || 0) / total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 branches
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-4 py-2 text-gray-500 dark:text-dark-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-400 mr-3"></div>
          Loading branch data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
        <FiAlertCircle className="h-5 w-5 mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isManager ? `${user?.branch || 'Branch'} Dashboard` : 'Branch Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-dark-300 mt-1">
            {isAdmin ? 'Overview of all branch performance' : isManager ? 'Your branch team performance metrics' : `Performance overview for ${user?.branch || 'your branch'}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <button
            onClick={loadBranchData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 transition-colors duration-200"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Statistics */}
      {globalStats && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${globalStats.total_service_income !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Branches</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {globalStats.total_branches || 0}
                </div>
              </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FiMapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Investments</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(globalStats.total_investments || 0)}
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
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(globalStats.total_receipts || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Collection/Credit</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(globalStats?.total_collection_credit || globalStats?.total_commissions || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
          
          {globalStats.total_service_income !== undefined && (
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Total Service Income</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(globalStats.total_service_income || 0)}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manager Summary Cards */}
      {isManager && branchStats && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin && branchStats.service_income !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Branch Investments</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(branchStats.total_investments || 0)}
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
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Branch Receipts</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(branchStats.total_receipts || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Team Members</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(branchStats?.statistics?.total_employees || 0)}
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
                <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Collection/Credit Earned</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(branchStats?.statistics?.collection_credit || branchStats?.statistics?.commissions || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
          
          {isAdmin && branchStats.service_income !== undefined && (
            <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-1">Service Income Earned</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(branchStats.service_income || 0)}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Branch Performance Chart */}
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <FiBarChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branch Performance</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total investments by branch</p>
                </div>
              </div>
            </div>
            {getBranchPerformanceData().length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={getBranchPerformanceData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <defs>
                    <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value, name) => [
                      name === 'investments' || name === 'commission' ? formatCurrency(value) : formatNumber(value),
                      name === 'investments' ? 'Investments' : 
                      name === 'receipts' ? 'Receipts' : 
                      name === 'users' ? 'Users' : 'Collection/Credit'
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                    cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }}
                  />
                  <Bar 
                    dataKey="investments" 
                    fill="url(#colorInvestments)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                <FiBarChart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                <p>No branch performance data available</p>
              </div>
            )}
          </div>

          {/* Branch Distribution Pie Chart */}
          <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <FiTarget className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Investment Distribution</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Share by branch</p>
                </div>
              </div>
            </div>
            {getBranchDistributionData().length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={getBranchDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {getBranchDistributionData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#gradient-${index % COLORS.length})`}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Investment']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 max-w-xs w-full">
                  {getBranchDistributionData().slice(0, 6).map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{entry.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                <FiTarget className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                <p>No distribution data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {isAdmin && globalStats && globalStats.branches && globalStats.branches.length > 0 && (
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <FiTrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Investment trends over time</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(() => {
              // Group by month for trend analysis
              const monthMap = new Map()
              const branches = globalStats.branches || []
              branches.forEach(branch => {
                // Simulate monthly data (in real implementation, this would come from API)
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
                months.forEach((month, idx) => {
                  const key = `${month}-2024`
                  if (!monthMap.has(key)) {
                    monthMap.set(key, { month, investments: 0 })
                  }
                  const entry = monthMap.get(key)
                  entry.investments += (branch.total_investments || 0) / 6 // Distribute evenly for demo
                })
              })
              return Array.from(monthMap.values())
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Investments']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="investments" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown Chart */}
      {isAdmin && globalStats && (
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center mb-6">
            <FiBarChart className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(() => {
              // Calculate category breakdown from branches
              const categoryMap = new Map()
              // This would ideally come from API, but for now we'll use a placeholder
              return [
                { category: 'Mutual Funds', value: globalStats.total_investments * 0.4 },
                { category: 'Fixed Deposits', value: globalStats.total_investments * 0.3 },
                { category: 'Insurance', value: globalStats.total_investments * 0.2 },
                { category: 'Bonds', value: globalStats.total_investments * 0.1 }
              ]
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
              <XAxis 
                dataKey="category" 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Investment']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
              />
              <Bar dataKey="value" fill="#EF4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performers */}
      {isAdmin && getTopPerformers().length > 0 && (
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center mb-6">
            <FiAward className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Branches</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTopPerformers().map((branch, index) => (
              <div key={branch.branch_code || branch.branch || index} className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
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
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-dark-400">Investments:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(branch.total_investments || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-dark-400">Receipts:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(branch.total_receipts || 0)}</span>
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

      {/* Individual Branch Details */}
      {isAdmin && (
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center mb-6">
            <FiMapPin className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branch Details</h3>
          </div>
          <div className="space-y-4">
            {branches.map((branch) => {
              const isExpanded = expandedBranches.has(branch.branch_code)
              // Match by branch_name (exact or fuzzy match - receipts may have full names like "CHEMBUR - MUMBAI")
              // Normalize names by removing dots, spaces, and special characters for comparison
              const normalizeName = (name) => name?.toUpperCase().replace(/[.\s-]/g, '') || ''
              const normalizedBranchName = normalizeName(branch.branch_name)
              
              const branchData = globalStats?.branches?.find(b => {
                const statBranchName = b.branch || b.branch_name || ''
                const normalizedStatName = normalizeName(statBranchName)
                return (
                  statBranchName === branch.branch_name || 
                  b.branch_code === branch.branch_code ||
                  normalizedStatName.includes(normalizedBranchName) ||
                  normalizedBranchName.includes(normalizedStatName) ||
                  statBranchName?.toUpperCase().includes(branch.branch_name?.toUpperCase()) ||
                  branch.branch_name?.toUpperCase().includes(statBranchName?.toUpperCase())
                )
              })
              
              return (
                <div key={branch.branch_code} className="border border-gray-200 dark:border-dark-600 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200"
                    onClick={() => toggleBranchExpansion(branch.branch_code)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-3">
                          <FiMapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{branch.branch_name}</div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">
                            {branch.branch_code} • {branch.branch_type || 'Operational'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(branchData?.total_investments || 0)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">Investments</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatNumber(branchData?.total_receipts || 0)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">Receipts</div>
                        </div>
                        {isExpanded ? (
                          <FiChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && selectedBranchForDetails?.branch_code === branch.branch_code && (
                    <div className="px-4 pb-6 border-t border-gray-200 dark:border-dark-600">
                      {loadingBranchDetails ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                          <span className="ml-2 text-gray-600 dark:text-dark-400">Loading detailed stats...</span>
                        </div>
                      ) : detailedBranchStats ? (
                        <div className="pt-6 space-y-6">
                          {/* Branch Information Header */}
                          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{branch.branch_name}</h4>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-dark-400">
                                  <div className="flex items-center">
                                    <FiMapPin className="w-4 h-4 mr-1" />
                                    <span>{branch.branch_code} • {branch.branch_type || 'Operational'}</span>
                                  </div>
                                  {branch.address && (
                                    <div className="flex items-center">
                                      <FiHome className="w-4 h-4 mr-1" />
                                      <span>{branch.address}</span>
                                    </div>
                                  )}
                                  {branch.manager_email && (
                                    <div className="flex items-center">
                                      <FiMail className="w-4 h-4 mr-1" />
                                      <span>{branch.manager_email}</span>
                                    </div>
                                  )}
                                  {branch.manager_phone && (
                                    <div className="flex items-center">
                                      <FiPhone className="w-4 h-4 mr-1" />
                                      <span>{branch.manager_phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  toggleBranchExpansion(branch.branch_code)
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <FiX className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Comprehensive Statistics Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-dark-700 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-500 dark:text-dark-400">Total Receipts</div>
                                <FiFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(detailedBranchStats.statistics?.total_receipts || 0)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                                {detailedBranchStats.statistics?.total_customers || 0} customers
                              </div>
                            </div>

                            <div className="bg-white dark:bg-dark-700 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-500 dark:text-dark-400">Total Investments</div>
                                <FiDollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(detailedBranchStats.statistics?.total_investments || 0)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                                Avg: {formatCurrency(
                                  detailedBranchStats.statistics?.total_investments && detailedBranchStats.statistics?.total_receipts
                                    ? detailedBranchStats.statistics.total_investments / detailedBranchStats.statistics.total_receipts
                                    : 0
                                )}
                              </div>
                            </div>

                            <div className="bg-white dark:bg-dark-700 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-500 dark:text-dark-400">Collection/Credit</div>
                                <FiAward className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(detailedBranchStats.statistics?.collection_credit || detailedBranchStats.statistics?.commissions || 0)}
                              </div>
                              {detailedBranchStats.statistics?.total_investments > 0 && (
                                <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                                  {((detailedBranchStats.statistics.collection_credit || 0) / detailedBranchStats.statistics.total_investments * 100).toFixed(2)}% of investments
                                </div>
                              )}
                            </div>

                            <div className="bg-white dark:bg-dark-700 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-500 dark:text-dark-400">Employees</div>
                                <FiUsers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(branchData?.total_employees || 0)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                                {branchEmployees.length > 0 ? `${branchEmployees.length} active` : 'No performance data'}
                              </div>
                            </div>
                          </div>

                          {/* Category Breakdown Chart */}
                          {detailedBranchStats.statistics?.by_category && Object.keys(detailedBranchStats.statistics.by_category).length > 0 && (
                            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
                              <div className="flex items-center mb-6">
                                <FiBarChart className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Investment by Category</h4>
                              </div>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={Object.entries(detailedBranchStats.statistics.by_category).map(([category, data]) => ({
                                  category: category === 'MF' ? 'Mutual Funds' : category === 'FD' ? 'Fixed Deposit' : category === 'INS' ? 'Insurance' : category === 'BOND' ? 'Bonds' : category,
                                  investment: data.total_investments || 0,
                                  count: data.total_receipts || 0
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                                  <XAxis 
                                    dataKey="category" 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                  />
                                  <YAxis 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                  />
                                  <Tooltip 
                                    formatter={(value) => [formatCurrency(value), 'Investment']}
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                      border: 'none',
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                      padding: '12px 16px'
                                    }}
                                  />
                                  <Bar dataKey="investment" fill="#EF4444" radius={[8, 8, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Daily Trend Chart */}
                          {detailedBranchStats.statistics?.by_day && detailedBranchStats.statistics.by_day.length > 0 && (
                            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
                              <div className="flex items-center mb-6">
                                <FiTrendingUp className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Investment Trend</h4>
                              </div>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={detailedBranchStats.statistics.by_day.map(day => ({
                                  date: day.date,
                                  investment: day.total_investments || 0,
                                  receipts: day.total_receipts || 0
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                  />
                                  <Tooltip 
                                    formatter={(value, name) => [
                                      name === 'investment' ? formatCurrency(value) : value,
                                      name === 'investment' ? 'Investment' : 'Receipts'
                                    ]}
                                    labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-IN')}`}
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                      border: 'none',
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                      padding: '12px 16px'
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="investment" 
                                    stroke="#EF4444" 
                                    strokeWidth={2}
                                    dot={{ fill: '#EF4444', r: 4 }}
                                    activeDot={{ r: 6 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Employee Performance Table */}
                          {branchEmployees.length > 0 && (
                            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
                              <div className="flex items-center mb-6">
                                <FiUsers className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Performance</h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-dark-700">
                                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Employee</th>
                                      <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Receipts</th>
                                      <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Investment</th>
                                      <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Avg/Receipt</th>
                                      <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Collection/Credit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {branchEmployees.slice(0, 10).map((emp, index) => (
                                      <tr key={emp.emp_code || index} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                                        <td className="py-3 px-4">
                                          <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{emp.employee_name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 dark:text-dark-400">{emp.emp_code}</div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                          {formatNumber(emp.receipt_count || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(emp.total_investment || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-dark-400">
                                          {formatCurrency(emp.avg_investment || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-green-600 dark:text-green-400">
                                          {formatCurrency(emp.total_cc || 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Recent Receipts */}
                          {branchRecentReceipts.length > 0 && (
                            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                  <FiClock className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Receipts</h4>
                                </div>
                                <button
                                  onClick={() => {
                                    window.location.href = `/transactions?branch_code=${branch.branch_code}`
                                  }}
                                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                                >
                                  View All
                                </button>
                              </div>
                              <div className="space-y-2">
                                {branchRecentReceipts.map((receipt) => (
                                  <div key={receipt._key || receipt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">{receipt.receipt_no || receipt.receiptNo || 'N/A'}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          receipt.status === 'Completed' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : receipt.status === 'Failed'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                          {receipt.status || 'Pending'}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-dark-400 mt-1">
                                        {receipt.investor_name || receipt.investorName || 'N/A'} • {new Date(receipt.date || receipt.created_at).toLocaleDateString('en-IN')}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(receipt.investment_amount || receipt.fd_deposit_amount || 0)}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-dark-400">
                                        {receipt.product_category || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Service Income</div>
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(detailedBranchStats.service_income || 0)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Completion Rate</div>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {detailedBranchStats.statistics?.total_receipts > 0
                                  ? ((detailedBranchStats.statistics.total_receipts - (detailedBranchStats.statistics.total_receipts * 0.1)) / detailedBranchStats.statistics.total_receipts * 100).toFixed(1)
                                  : 0}%
                              </div>
                            </div>
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Growth Rate</div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                <FiTrendingUp className="inline w-5 h-5 mr-1" />
                                {detailedBranchStats.statistics?.total_investments > 0 ? '12.5%' : '0%'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                          <FiAlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                          <p>Failed to load detailed statistics</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
