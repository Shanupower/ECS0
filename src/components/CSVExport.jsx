import React, { useState } from 'react'
import { api } from '../api'
import { FiDownload, FiCalendar, FiFilter, FiLoader } from 'react-icons/fi'

export default function CSVExport({ token, user, onExport }) {
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState('receipts')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })
  const [branchCode, setBranchCode] = useState('')

  const handleExport = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      let queryParams = {}
      
      if (dateRange.from) queryParams.from = dateRange.from
      if (dateRange.to) queryParams.to = dateRange.to
      if (branchCode) queryParams.branch_code = branchCode
      
      let url = ''
      switch (exportType) {
        case 'receipts':
          url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/receipts`
          break
        case 'customers':
          url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/customers`
          break
        case 'users':
          url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/users`
          break
        case 'branches':
          url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/branches`
          break
        default:
          throw new Error('Invalid export type')
      }
      
      // Add query parameters
      const queryString = new URLSearchParams(queryParams).toString()
      if (queryString) url += `?${queryString}`
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', '')
      
      // Add authorization header by fetching with token
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      link.href = downloadUrl
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      if (onExport) onExport(exportType)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
      <div className="flex items-center mb-4">
        <FiDownload className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h3>
      </div>
      
      <div className="space-y-4">
        {/* Export Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
            Export Type
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="receipts">Receipts</option>
            <option value="customers">Customers</option>
            {isAdmin && <option value="users">Users</option>}
            {isAdmin && <option value="branches">Branches</option>}
          </select>
        </div>

        {/* Date Range Filter (for receipts) */}
        {exportType === 'receipts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Branch Filter (for receipts and admin users) */}
        {(exportType === 'receipts' || (exportType === 'users' && isAdmin)) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
              Branch Filter (Optional)
            </label>
            <input
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="Enter branch code (e.g., MEDAK)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FiDownload className="w-4 h-4 mr-2" />
              Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)}
            </>
          )}
        </button>

        {/* Help Text */}
        <div className="text-xs text-gray-500 dark:text-dark-400">
          <p>• CSV files will be downloaded automatically</p>
          <p>• Date filters apply to receipts only</p>
          <p>• Branch filter is optional for receipts and user exports</p>
          {!isAdmin && <p>• Some export options are only available to administrators</p>}
        </div>
      </div>
    </div>
  )
}
