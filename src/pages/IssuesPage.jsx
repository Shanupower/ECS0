import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

// Component to load authenticated images
const AuthenticatedImage = ({ issueId, filename, alt, className, token }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(false)
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    if (!filename || !token) return

    // Try static file serving first
    const staticUrl = `${baseUrl}/uploads/${filename}`
    const img = new Image()
    
    img.onload = () => {
      setImageUrl(staticUrl)
      setError(false)
    }
    
    img.onerror = () => {
      // If static fails, fetch with authentication
      fetch(`${baseUrl}/api/issues/${issueId}/photo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch image')
          return response.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setImageUrl(url)
          setError(false)
        })
        .catch(err => {
          console.error('Failed to load image:', err)
          setError(true)
        })
    }
    
    img.src = staticUrl

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [issueId, filename, token])

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
        Failed to load image: {filename}
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-dark-700 rounded">
        Loading image...
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
    />
  )
}
import { 
  FiAlertTriangle, 
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiMessageSquare,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiEdit,
  FiEye,
  FiX,
  FiUser,
  FiMail,
  FiMapPin,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity
} from 'react-icons/fi'

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function IssuesPage() {
  const { token, user } = useAuth()
  const [issues, setIssues] = useState([])
  const [allIssues, setAllIssues] = useState([]) // For stats calculation
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [submitterFilter, setSubmitterFilter] = useState('')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [fixText, setFixText] = useState('')
  const [submittingFix, setSubmittingFix] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    loadIssues()
    loadAllIssuesForStats()
  }, [token, isAdmin, page, statusFilter, priorityFilter])

  const loadAllIssuesForStats = async () => {
    if (!token) return
    
    setStatsLoading(true)
    try {
      const result = await api.listIssues(token, { page: '1', size: '1000', status: 'all' })
      setAllIssues(Array.isArray(result.items) ? result.items : [])
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadIssues = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const query = {
        page: page.toString(),
        size: pageSize.toString(),
        sort: 'created_at:desc',
        status: statusFilter
      }
      const result = await api.listIssues(token, query)
      setIssues(Array.isArray(result.items) ? result.items : [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats from all issues
  const stats = useMemo(() => {
    const total = allIssues.length
    const open = allIssues.filter(i => i.status === 'open').length
    const inProgress = allIssues.filter(i => i.status === 'in_progress').length
    const resolved = allIssues.filter(i => i.status === 'resolved').length
    const closed = allIssues.filter(i => i.status === 'closed').length
    const urgent = allIssues.filter(i => i.priority === 'urgent').length
    const high = allIssues.filter(i => i.priority === 'high').length
    const pending = open + inProgress // Pending = open + in progress
    
    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      urgent,
      high,
      pending
    }
  }, [allIssues])

  const handleAddFix = async () => {
    if (!fixText.trim() || !selectedIssue) return
    
    setSubmittingFix(true)
    try {
      await api.addIssueFix(token, selectedIssue.id, fixText)
      setFixText('')
      setShowFixModal(false)
      await loadIssues()
      // Reload selected issue
      const updatedIssue = await api.getIssue(token, selectedIssue.id)
      setSelectedIssue(updatedIssue)
    } catch (err) {
      alert('Failed to add fix: ' + err.message)
    } finally {
      setSubmittingFix(false)
    }
  }

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      await api.updateIssueStatus(token, issueId, newStatus)
      await loadIssues()
      if (selectedIssue && selectedIssue.id === issueId) {
        const updatedIssue = await api.getIssue(token, issueId)
        setSelectedIssue(updatedIssue)
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handlePriorityChange = async (issueId, newPriority) => {
    try {
      await api.updateIssuePriority(token, issueId, newPriority)
      await loadIssues()
      if (selectedIssue && selectedIssue.id === issueId) {
        const updatedIssue = await api.getIssue(token, issueId)
        setSelectedIssue(updatedIssue)
      }
    } catch (err) {
      alert('Failed to update priority: ' + err.message)
    }
  }

  const viewIssue = async (issue) => {
    try {
      const fullIssue = await api.getIssue(token, issue.id)
      setSelectedIssue(fullIssue)
    } catch (err) {
      alert('Failed to load issue details: ' + err.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <FiAlertCircle className="w-4 h-4" />
      case 'in_progress': return <FiClock className="w-4 h-4" />
      case 'resolved': return <FiCheckCircle className="w-4 h-4" />
      case 'closed': return <FiXCircle className="w-4 h-4" />
      default: return <FiAlertCircle className="w-4 h-4" />
    }
  }

  // Filter issues based on search query and filters
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchQuery || 
      issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id?.toString().includes(searchQuery)
    
    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter
    
    const matchesSubmitter = !submitterFilter || 
      issue.created_by_user?.name?.toLowerCase().includes(submitterFilter.toLowerCase()) ||
      issue.created_by_user?.emp_code?.toLowerCase().includes(submitterFilter.toLowerCase()) ||
      issue.created_by_user?.email?.toLowerCase().includes(submitterFilter.toLowerCase())
    
    return matchesSearch && matchesPriority && matchesSubmitter
  })

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <FiAlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Issues Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and resolve all reported issues</p>
        </div>
        <button
          onClick={() => {
            loadIssues()
            loadAllIssuesForStats()
          }}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Issues */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Issues</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="bg-blue-400/20 rounded-full p-3">
                <FiActivity className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Pending Issues */}
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-2">{stats.pending}</p>
                <p className="text-yellow-100 text-xs mt-1">
                  {stats.open} Open • {stats.inProgress} In Progress
                </p>
              </div>
              <div className="bg-yellow-400/20 rounded-full p-3">
                <FiClock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">High Priority</p>
                <p className="text-3xl font-bold mt-2">{stats.urgent + stats.high}</p>
                <p className="text-red-100 text-xs mt-1">
                  {stats.urgent} Urgent • {stats.high} High
                </p>
              </div>
              <div className="bg-red-400/20 rounded-full p-3">
                <FiAlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Resolved</p>
                <p className="text-3xl font-bold mt-2">{stats.resolved + stats.closed}</p>
                <p className="text-green-100 text-xs mt-1">
                  {stats.resolved} Resolved • {stats.closed} Closed
                </p>
              </div>
              <div className="bg-green-400/20 rounded-full p-3">
                <FiCheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
          <FiAlertCircle className="text-red-500" size={20} />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className="lg:col-span-2 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All Issues</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by submitter..."
                  value={submitterFilter}
                  onChange={(e) => setSubmitterFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value)
                    setPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Issues Display */}
          {loading ? (
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-8 text-center">
              <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-8 text-center">
              <FiAlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No issues found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`bg-white dark:bg-dark-800 rounded-lg shadow hover:shadow-lg transition-all duration-200 border-2 cursor-pointer ${
                    selectedIssue?.id === issue.id 
                      ? 'border-red-500 dark:border-red-600' 
                      : 'border-transparent hover:border-gray-200 dark:hover:border-dark-700'
                  }`}
                  onClick={() => viewIssue(issue)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">#{issue.id}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority] || priorityColors.medium}`}>
                            {issue.priority || 'medium'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[issue.status] || statusColors.open}`}>
                            {getStatusIcon(issue.status)}
                            <span className="ml-1 capitalize">{issue.status?.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">
                          {issue.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-700">
                      <div className="flex items-center space-x-2">
                        {issue.created_by_user ? (
                          <>
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <FiUser className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {issue.created_by_user.name || 'Unknown'}
                              </p>
                              {issue.created_by_user.branch && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{issue.created_by_user.branch}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Unknown User</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(issue.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`bg-white dark:bg-dark-800 rounded-lg shadow hover:shadow-md transition-all duration-200 border-l-4 cursor-pointer ${
                    selectedIssue?.id === issue.id 
                      ? 'border-l-red-500 dark:border-l-red-600 bg-red-50 dark:bg-red-900/10' 
                      : issue.priority === 'urgent' 
                        ? 'border-l-red-500' 
                        : issue.priority === 'high'
                          ? 'border-l-orange-500'
                          : 'border-l-gray-300 dark:border-l-dark-700 hover:border-l-red-400'
                  }`}
                  onClick={() => viewIssue(issue)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">#{issue.id}</span>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
                            {issue.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority] || priorityColors.medium}`}>
                            {issue.priority || 'medium'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[issue.status] || statusColors.open}`}>
                            {getStatusIcon(issue.status)}
                            <span className="ml-1 capitalize">{issue.status?.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                          {issue.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          {issue.created_by_user && (
                            <div className="flex items-center space-x-1">
                              <FiUser className="w-3 h-3" />
                              <span>{issue.created_by_user.name || 'Unknown'}</span>
                              {issue.created_by_user.branch && (
                                <>
                                  <FiMapPin className="w-3 h-3 ml-2" />
                                  <span>{issue.created_by_user.branch}</span>
                                </>
                              )}
                            </div>
                          )}
                          <span>{formatDate(issue.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredIssues.length > 0 && total > pageSize && (
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-4 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} issues
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= total}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Issue Details Sidebar */}
        {selectedIssue && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-6 space-y-4 sticky top-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Issue #{selectedIssue.id}</h2>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</h3>
                <p className="text-gray-900 dark:text-gray-100">{selectedIssue.title}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h3>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedIssue.description}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Submitted By</h3>
                {selectedIssue.created_by_user ? (
                  <div className="space-y-1">
                    <div className="flex items-center text-gray-900 dark:text-gray-100">
                      <FiUser className="w-4 h-4 mr-2" />
                      <span className="font-medium">{selectedIssue.created_by_user.name || 'Unknown'}</span>
                    </div>
                    {selectedIssue.created_by_user.emp_code && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                        Employee Code: {selectedIssue.created_by_user.emp_code}
                      </div>
                    )}
                    {selectedIssue.created_by_user.email && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 ml-6 flex items-center">
                        <FiMail className="w-3 h-3 mr-1" />
                        {selectedIssue.created_by_user.email}
                      </div>
                    )}
                    {selectedIssue.created_by_user.branch && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 ml-6 flex items-center">
                        <FiMapPin className="w-3 h-3 mr-1" />
                        {selectedIssue.created_by_user.branch}
                      </div>
                    )}
                    {selectedIssue.created_by_user.role && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                        Role: <span className="capitalize">{selectedIssue.created_by_user.role}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">User information not available</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</h3>
                  <select
                    value={selectedIssue.priority || 'medium'}
                    onChange={(e) => handlePriorityChange(selectedIssue.id, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${priorityColors[selectedIssue.priority] || priorityColors.medium} border-0`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</h3>
                  <select
                    value={selectedIssue.status || 'open'}
                    onChange={(e) => handleStatusChange(selectedIssue.id, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${statusColors[selectedIssue.status] || statusColors.open} border-0`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(selectedIssue.created_at)}</p>
              </div>

              {selectedIssue.updated_by_user && selectedIssue.updated_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Updated</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {formatDate(selectedIssue.updated_at)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    By: {selectedIssue.updated_by_user.name || 'Unknown'}
                  </p>
                </div>
              )}

              {selectedIssue.photo && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo</h3>
                  {(() => {
                    // Get filename from photo object, or extract from file_path if needed
                    let filename = selectedIssue.photo.filename
                    if (!filename && selectedIssue.photo.file_path) {
                      // Extract just the filename from the full path
                      const pathParts = selectedIssue.photo.file_path.split(/[/\\]/)
                      filename = pathParts[pathParts.length - 1]
                    }
                    
                    if (filename) {
                      return (
                        <AuthenticatedImage
                          issueId={selectedIssue.id}
                          filename={filename}
                          alt="Issue photo"
                          className="w-full rounded-lg border border-gray-200 dark:border-dark-700"
                          token={token}
                        />
                      )
                    } else {
                      return (
                        <div className="text-sm text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-dark-700 rounded">
                          Photo filename not available
                        </div>
                      )
                    }
                  })()}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fixes/Responses</h3>
                  <button
                    onClick={() => setShowFixModal(true)}
                    className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <FiMessageSquare className="w-4 h-4" />
                    <span>Add Fix</span>
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedIssue.fixes && selectedIssue.fixes.length > 0 ? (
                    selectedIssue.fixes.map((fix, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                            <FiUser className="w-3 h-3 mr-1" />
                            {fix.created_by_user?.name || 'Unknown User'}
                            {fix.created_by_user?.emp_code && (
                              <span className="ml-2">({fix.created_by_user.emp_code})</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(fix.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{fix.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No fixes/responses yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Fix Modal */}
      {showFixModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Fix/Response</h2>
              <button
                onClick={() => {
                  setShowFixModal(false)
                  setFixText('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fix/Response Text
                </label>
                <textarea
                  value={fixText}
                  onChange={(e) => setFixText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter the fix or response..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowFixModal(false)
                    setFixText('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFix}
                  disabled={!fixText.trim() || submittingFix}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingFix ? 'Adding...' : 'Add Fix'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

