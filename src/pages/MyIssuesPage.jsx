import React, { useState, useEffect } from 'react'
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
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiEye,
  FiX,
  FiImage
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

export default function MyIssuesPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  useEffect(() => {
    if (!token) return
    loadIssues()
  }, [token, page, statusFilter])

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
      const result = await api.listMyIssues(token, query)
      setIssues(Array.isArray(result.items) ? result.items : [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load issues')
    } finally {
      setLoading(false)
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

  // Filter issues based on search query
  const filteredIssues = issues.filter(issue => {
    const query = searchQuery.toLowerCase()
    return (
      issue.title?.toLowerCase().includes(query) ||
      issue.description?.toLowerCase().includes(query) ||
      issue.id?.toString().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FiAlertTriangle className="w-6 h-6 text-[var(--warn)] mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Issues</h1>
            <p className="text-[var(--text-secondary)] mt-1">View issues you have reported</p>
          </div>
        </div>
        <button
          onClick={loadIssues}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] hover:bg-[var(--card-hover)] transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="border border-[var(--error)]/70 bg-[var(--error-muted)] rounded-lg p-4 flex items-center space-x-2 text-[var(--error)]">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className="lg:col-span-2 space-y-4">
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
              </div>
            </div>
          </div>

          {/* Issues Table */}
          <div className="rounded-lg shadow overflow-hidden border border-[var(--stroke)] bg-[var(--card-bg)]">
            {loading ? (
              <div className="p-8 text-center">
                <FiRefreshCw className="w-6 h-6 animate-spin text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">Loading issues...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-8 text-center">
                <FiAlertTriangle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No issues found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--card-hover)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--stroke)]/70">
                    {filteredIssues.map((issue) => (
                      <tr 
                        key={issue.id} 
                        className={`hover:bg-[var(--card-bg-opaque)] cursor-pointer ${selectedIssue?.id === issue.id ? 'bg-[var(--accent-muted)]/40' : ''}`}
                        onClick={() => viewIssue(issue)}
                      >
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)]">#{issue.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-[var(--text-primary)]">{issue.title}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
                            {issue.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority] || priorityColors.medium}`}>
                            {issue.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[issue.status] || statusColors.open}`}>
                            {getStatusIcon(issue.status)}
                            <span className="ml-1 capitalize">{issue.status?.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {formatDate(issue.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              viewIssue(issue)
                            }}
                            className="text-[var(--accent)] hover:text-[var(--accent)]/90"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="px-4 py-3 border-t border-[var(--stroke)] flex items-center justify-between bg-[var(--card-bg-opaque)]">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} issues
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-[var(--stroke)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-primary)]"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                    className="px-3 py-1 border border-[var(--stroke)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-primary)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${priorityColors[selectedIssue.priority] || priorityColors.medium}`}>
                    {selectedIssue.priority || 'medium'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusColors[selectedIssue.status] || statusColors.open}`}>
                    {getStatusIcon(selectedIssue.status)}
                    <span className="ml-1 capitalize">{selectedIssue.status?.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Created</h3>
                <p className="text-sm text-[var(--text-secondary)]">{formatDate(selectedIssue.created_at)}</p>
              </div>

              {selectedIssue.photo && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Photo</h3>
                  <div className="relative">
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
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Fixes/Responses</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedIssue.fixes && selectedIssue.fixes.length > 0 ? (
                    selectedIssue.fixes.map((fix, idx) => (
                      <div key={idx} className="rounded-lg p-3 bg-[var(--card-bg-opaque)]">
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{fix.text}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{formatDate(fix.created_at)}</p>
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
    </div>
  )
}

