import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiClock, 
  FiFilter, 
  FiEye, 
  FiTrash2, 
  FiRotateCw, 
  FiRefreshCw,
  FiAlertCircle,
  FiUser,
  FiCalendar
} from 'react-icons/fi'

export default function TransactionsPage() {
  const { token, user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    from: new Date().toISOString().slice(0, 7) + '-01', // First day of current month
    to: new Date().toISOString().slice(0, 10), // Today
    category: '',
    issuer: '',
    emp_code: '',
    size: 20,
    sort: 'created_at:desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasMore: false
  })

  const loadReceipts = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const query = { ...filters, page: pagination.page }
      let result
      
      // Use employee-specific endpoint if filtering by employee code and user is admin
      // or if user is employee (show only their own receipts)
      if (filters.emp_code && isAdmin) {
        result = await api.getReceiptsByEmpCode(token, filters.emp_code, query)
      } else if (!isAdmin && user?.emp_code) {
        // For employees, always use their own emp_code
        result = await api.getReceiptsByEmpCode(token, user.emp_code, query)
      } else {
        result = await api.listReceipts(token, query)
      }
      
      if (Array.isArray(result)) {
        setReceipts(result)
        setPagination(prev => ({ ...prev, total: result.length, hasMore: result.length === filters.size }))
      } else if (result.items && Array.isArray(result.items)) {
        // Handle the new API response structure: {items: [], page: 1, size: 20, total: 2}
        setReceipts(result.items)
        setPagination(prev => ({ 
          ...prev, 
          total: result.total || result.items.length,
          hasMore: result.items.length === result.size
        }))
      } else if (result.data && Array.isArray(result.data)) {
        // Handle legacy response structure: {data: [], total: 2}
        setReceipts(result.data)
        setPagination(prev => ({ 
          ...prev, 
          total: result.total || result.data.length,
          hasMore: result.hasMore || false
        }))
      } else {
        setReceipts([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load receipts')
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReceipts()
  }, [token, filters, pagination.page])

  const handleDelete = async (receiptId, reason = 'deleted by user') => {
    if (!confirm('Are you sure you want to delete this receipt?')) return
    
    try {
      await api.deleteReceipt(token, receiptId, reason)
      await loadReceipts() // Reload the list
    } catch (err) {
      alert('Failed to delete receipt: ' + err.message)
    }
  }

  const handleRestore = async (receiptId) => {
    try {
      await api.restoreReceipt(token, receiptId)
      await loadReceipts() // Reload the list
    } catch (err) {
      alert('Failed to restore receipt: ' + err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getStatusBadge = (receipt) => {
    if (receipt.deleted_at) {
      return <span style={{ background: '#fee', color: '#c33', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>Deleted</span>
    }
    return <span style={{ background: '#efe', color: '#363', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>Active</span>
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FiClock className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-600 mt-1">View and manage all receipts</p>
          </div>
        </div>
        <button
          onClick={loadReceipts}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <FiFilter className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filters.from}
                onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filters.to}
                onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            >
              <option value="">All Categories</option>
              <option value="MF">Mutual Fund</option>
              <option value="FD">Fixed Deposit</option>
              <option value="INS">Insurance</option>
              <option value="BOND">Bonds</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issuer</label>
            <input
              type="text"
              value={filters.issuer}
              onChange={e => setFilters(prev => ({ ...prev, issuer: e.target.value }))}
              placeholder="Filter by issuer"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            />
          </div>
        </div>
        {isAdmin && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.emp_code}
                onChange={e => setFilters(prev => ({ ...prev, emp_code: e.target.value }))}
                placeholder="Filter by employee"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-3"></div>
            Loading receipts...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id || receipt.receipt_no} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.receipt_no || receipt.receiptNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(receipt.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <FiUser className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{receipt.investor_name || receipt.investorName}</div>
                          <div className="text-sm text-gray-500">{receipt.investor_id || receipt.investorId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{receipt.scheme_name || receipt.schemeName}</div>
                        <div className="text-sm text-gray-500">{receipt.product_category || receipt.issuer_category || receipt.issuerCategory}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(receipt.investment_amount || receipt.investmentAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <FiUser className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{receipt.employee_name || receipt.employeeName}</div>
                          <div className="text-sm text-gray-500">{receipt.emp_code || receipt.empCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {receipt.deleted_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {/* Only show View button if user can access this receipt */}
                        {(isAdmin || (receipt.emp_code || receipt.empCode) === user?.emp_code) && (
                          <button
                            onClick={() => window.open(`/receipts/${receipt.id}`, '_blank')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <FiEye className="w-3 h-3 mr-1" />
                            View
                          </button>
                        )}
                        {/* Only show Delete/Restore buttons if user can modify this receipt */}
                        {(isAdmin || (receipt.emp_code || receipt.empCode) === user?.emp_code) && (
                          <>
                            {receipt.deleted_at ? (
                              <button
                                onClick={() => handleRestore(receipt.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <FiRotateCw className="w-3 h-3 mr-1" />
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(receipt.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <FiTrash2 className="w-3 h-3 mr-1" />
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {receipts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FiClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No receipts found for the selected filters.</p>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.hasMore && (
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
