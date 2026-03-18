import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
      <div className="flex justify-center py-12">
        <div className="inline-flex items-center px-4 py-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--error)]">
          <FiAlertTriangle className="w-5 h-5 mr-2" />
          <p>Access denied. Admin only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Issues Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Monitor and resolve all reported issues</p>
        </div>
        <button
          onClick={() => {
            loadIssues()
            loadAllIssuesForStats()
          }}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Issues */}
          <div className="p-4 sm:p-5 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Total Issues</p>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--info-muted)] flex items-center justify-center">
                <FiActivity className="w-5 h-5 text-[var(--info)]" />
              </div>
            </div>
          </div>
          
          {/* Pending Issues */}
          <div className="p-4 sm:p-5 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.pending}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {stats.open} Open • {stats.inProgress} In Progress
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--warn-muted)] flex items-center justify-center">
                <FiClock className="w-5 h-5 text-[var(--warn)]" />
              </div>
            </div>
          </div>
          
          {/* High Priority */}
          <div className="p-4 sm:p-5 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">High Priority</p>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.urgent + stats.high}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {stats.urgent} Urgent • {stats.high} High
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--error-muted)] flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-[var(--error)]" />
              </div>
            </div>
          </div>
          
          {/* Resolved */}
          <div className="p-4 sm:p-5 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Resolved</p>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.resolved + stats.closed}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {stats.resolved} Resolved • {stats.closed} Closed
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--success-muted)] flex items-center justify-center">
                <FiCheckCircle className="w-5 h-5 text-[var(--success)]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-[var(--error)]/70 bg-[var(--error-muted)] rounded-lg p-4 flex items-center space-x-2 text-[var(--error)]">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className="lg:col-span-2 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">All Issues</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                List
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="rounded-lg shadow p-4 space-y-4 border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FiFilter className="text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter by submitter..."
                  value={submitterFilter}
                  onChange={(e) => setSubmitterFilter(e.target.value)}
                  className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                  className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
            <div className="rounded-lg shadow p-8 text-center border border-[var(--stroke)] bg-[var(--card-bg)]">
              <FiRefreshCw className="w-6 h-6 animate-spin text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="rounded-lg shadow p-8 text-center border border-[var(--stroke)] bg-[var(--card-bg)]">
              <FiAlertTriangle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">No issues found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-lg shadow hover:shadow-lg transition-all duration-200 border-2 cursor-pointer bg-[var(--card-bg)] ${
                    selectedIssue?.id === issue.id 
                      ? 'border-[var(--accent)]' 
                      : 'border-transparent hover:border-[var(--stroke)]'
                  }`}
                  onClick={() => viewIssue(issue)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-[var(--text-secondary)]">#{issue.id}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority] || priorityColors.medium}`}>
                            {issue.priority || 'medium'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[issue.status] || statusColors.open}`}>
                            {getStatusIcon(issue.status)}
                            <span className="ml-1 capitalize">{issue.status?.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 line-clamp-1">
                          {issue.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--stroke)]">
                      <div className="flex items-center space-x-2">
                        {issue.created_by_user ? (
                          <>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-muted)]">
                              <FiUser className="w-4 h-4 text-[var(--accent)]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {issue.created_by_user.name || 'Unknown'}
                              </p>
                              {issue.created_by_user.branch && (
                                <p className="text-xs text-[var(--text-secondary)]">{issue.created_by_user.branch}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Unknown User</span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
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
                  className={`rounded-lg shadow hover:shadow-md transition-all duration-200 border-l-4 cursor-pointer bg-[var(--card-bg)] ${
                    selectedIssue?.id === issue.id 
                      ? 'border-l-[var(--accent)] bg-[var(--accent-muted)]/40' 
                      : issue.priority === 'urgent' 
                        ? 'border-l-[var(--error)]' 
                        : issue.priority === 'high'
                          ? 'border-l-[var(--warn)]'
                          : 'border-l-[var(--stroke)] hover:border-l-[var(--accent)]'
                  }`}
                  onClick={() => viewIssue(issue)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-bold text-[var(--text-secondary)]">#{issue.id}</span>
                          <h3 className="text-base font-semibold text-[var(--text-primary)] flex-1">
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
                        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-1">
                          {issue.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-[var(--text-secondary)]">
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
            <div className="rounded-lg shadow p-4 flex items-center justify-between border border-[var(--stroke)] bg-[var(--card-bg-opaque)]">
              <div className="text-sm text-[var(--text-secondary)]">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} issues
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-[var(--stroke)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors text-[var(--text-primary)]"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= total}
                  className="px-4 py-2 border border-[var(--stroke)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors text-[var(--text-primary)]"
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
            <div className="rounded-lg shadow p-6 space-y-4 sticky top-4 border border-[var(--stroke)] bg-[var(--card-bg)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Issue #{selectedIssue.id}</h2>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Title</h3>
                <p className="text-[var(--text-primary)]">{selectedIssue.title}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Description</h3>
                <p className="text-[var(--text-primary)] whitespace-pre-wrap">{selectedIssue.description}</p>
              </div>

              {selectedIssue.receipt_draft_id && (
                <div>
                  <button
                    onClick={() => navigate(`/receipts?draftId=${selectedIssue.receipt_draft_id}`)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 transition-colors"
                  >
                    Recreate Receipt from Draft
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Submitted By</h3>
                {selectedIssue.created_by_user ? (
                  <div className="space-y-1">
                    <div className="flex items-center text-[var(--text-primary)]">
                      <FiUser className="w-4 h-4 mr-2" />
                      <span className="font-medium">{selectedIssue.created_by_user.name || 'Unknown'}</span>
                    </div>
                    {selectedIssue.created_by_user.emp_code && (
                      <div className="text-sm text-[var(--text-secondary)] ml-6">
                        Employee Code: {selectedIssue.created_by_user.emp_code}
                      </div>
                    )}
                    {selectedIssue.created_by_user.email && (
                      <div className="text-sm text-[var(--text-secondary)] ml-6 flex items-center">
                        <FiMail className="w-3 h-3 mr-1" />
                        {selectedIssue.created_by_user.email}
                      </div>
                    )}
                    {selectedIssue.created_by_user.branch && (
                      <div className="text-sm text-[var(--text-secondary)] ml-6 flex items-center">
                        <FiMapPin className="w-3 h-3 mr-1" />
                        {selectedIssue.created_by_user.branch}
                      </div>
                    )}
                    {selectedIssue.created_by_user.role && (
                      <div className="text-sm text-[var(--text-secondary)] ml-6">
                        Role: <span className="capitalize">{selectedIssue.created_by_user.role}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">User information not available</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</h3>
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
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Status</h3>
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
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Created</h3>
                <p className="text-sm text-[var(--text-secondary)]">{formatDate(selectedIssue.created_at)}</p>
              </div>

              {selectedIssue.updated_by_user && selectedIssue.updated_at && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Last Updated</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">
                    {formatDate(selectedIssue.updated_at)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    By: {selectedIssue.updated_by_user.name || 'Unknown'}
                  </p>
                </div>
              )}

              {selectedIssue.photo && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Photo</h3>
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
                            className="w-full rounded-lg border border-[var(--stroke)]"
                            token={token}
                          />
                        )
                    } else {
                        return (
                          <div className="text-sm text-[var(--text-secondary)] p-2 bg-[var(--card-bg-opaque)] rounded">
                            Photo filename not available
                          </div>
                        )
                    }
                  })()}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)]">Fixes/Responses</h3>
                  <button
                    onClick={() => setShowFixModal(true)}
                    className="flex items-center space-x-1 text-sm text-[var(--accent)] hover:text-[var(--accent)]/90"
                  >
                    <FiMessageSquare className="w-4 h-4" />
                    <span>Add Fix</span>
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedIssue.fixes && selectedIssue.fixes.length > 0 ? (
                    selectedIssue.fixes.map((fix, idx) => (
                      <div key={idx} className="rounded-lg p-3 bg-[var(--card-bg-opaque)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center text-xs text-[var(--text-secondary)]">
                            <FiUser className="w-3 h-3 mr-1" />
                            {fix.created_by_user?.name || 'Unknown User'}
                            {fix.created_by_user?.emp_code && (
                              <span className="ml-2">({fix.created_by_user.emp_code})</span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {formatDate(fix.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{fix.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No fixes/responses yet</p>
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

