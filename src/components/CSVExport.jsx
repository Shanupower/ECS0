import React, { useState } from 'react'
import { api } from '../api'
import { Card, Button, Select, Input } from '../components/ui'
import { useToast } from '../components/ui/Toast.jsx'
import { FiDownload, FiLoader } from 'react-icons/fi'

export default function CSVExport({ token, user, onExport }) {
  const toast = useToast()
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
      toast.error('Export failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = user?.role === 'admin'

  // If not admin, don't render the component
  if (!isAdmin) {
    return null
  }

  return (
    <Card padding="md" hover={false}>
      <div className="flex items-center gap-2 mb-4">
        <FiDownload className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="text-section-title text-[var(--text-primary)]">Export Data</h3>
      </div>
      <div className="space-y-4">
        <Select
          label="Export type"
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          className="text-[var(--text-primary)]"
        >
          <option value="receipts">Receipts</option>
          <option value="customers">Customers</option>
          {isAdmin && <option value="users">Users</option>}
          {isAdmin && <option value="branches">Branches</option>}
        </Select>

        {exportType === 'receipts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="From date"
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
            <Input
              label="To date"
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
        )}

        {(exportType === 'receipts' || (exportType === 'users' && isAdmin)) && (
          <Input
            label="Branch filter (optional)"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value)}
            placeholder="e.g. MEDAK"
          />
        )}

        <div>
          <Button
            className="w-full"
            variant="primary"
            icon={loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiDownload className="w-4 h-4" />}
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? 'Exporting...' : 'Export'}
          </Button>
          <p className="text-helper mt-1.5">Type: {exportType.charAt(0).toUpperCase() + exportType.slice(1)}</p>
        </div>

        <div className="text-helper space-y-1 pt-2 border-t border-[var(--stroke)]">
          <p>• CSV files download automatically</p>
          <p>• Date filters apply to receipts only</p>
          <p>• Branch filter is optional for receipts and user exports</p>
        </div>
      </div>
    </Card>
  )
}
