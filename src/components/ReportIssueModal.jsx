import React, { useState, useEffect } from 'react'
import { X, Upload, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Modal } from './ui/Modal'

const ReportIssueModal = ({ isOpen, onClose, initialData = null }) => {
  const { token, user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'high'
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'high'
      })
      if (initialData.screenshot) {
        setPhoto(initialData.screenshot)
        const reader = new FileReader()
        reader.onloadend = () => {
          setPhotoPreview(reader.result)
        }
        reader.readAsDataURL(initialData.screenshot)
      }
    } else if (isOpen && !initialData) {
      setFormData({ title: '', description: '', priority: 'medium' })
      setPhoto(null)
      setPhotoPreview(null)
    }
  }, [isOpen, initialData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for the photo')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setPhoto(file)
      setError('')
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    const fileInput = document.getElementById('photo')
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('You must be logged in to report an issue')
      return
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const issueData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        created_by: user?.id || user?.emp_code || 'unknown',
        receipt_draft_id: initialData?.receipt_draft_id || null
      }
      const result = await api.createIssue(token, issueData, photo)
      setSuccess(`Issue reported successfully! Issue ID: ${result.id || 'N/A'}`)
      setFormData({ title: '', description: '', priority: 'medium' })
      setPhoto(null)
      setPhotoPreview(null)
      const fileInput = document.getElementById('photo')
      if (fileInput) fileInput.value = ''
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 3000)
    } catch (err) {
      console.error('Error submitting issue:', err)
      setError(err.message || 'Failed to submit issue report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ title: '', description: '', priority: 'medium' })
    setPhoto(null)
    setPhotoPreview(null)
    setError('')
    setSuccess('')
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      setFormData({ title: '', description: '', priority: 'medium' })
      setPhoto(null)
      setPhotoPreview(null)
      setError('')
      setSuccess('')
    }
  }, [isOpen])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)] border-[var(--dashboard-primary)]/30'
      default:
        return 'bg-[var(--dashboard-border)]/50 text-[var(--dashboard-text)] border-[var(--dashboard-border)]'
    }
  }

  return (
    <Modal open={isOpen} onClose={handleClose} variant="dashboard" size="md">
      <div className="flex min-h-0 max-h-[inherit] flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-bg)] p-4 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-[var(--dashboard-text)]">Report an Issue</h2>
            <p className="text-sm text-[var(--dashboard-muted)] mt-1">Help us improve by reporting problems</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] transition-colors rounded-lg hover:bg-[var(--dashboard-border)]/50"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start space-x-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <span className="text-red-700 dark:text-red-300 text-sm flex-1 min-w-0">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start space-x-3 animate-in slide-in-from-top-2 duration-200">
                <CheckCircle2 className="text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                <span className="text-green-700 dark:text-green-300 text-sm flex-1 min-w-0">{success}</span>
              </div>
            )}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                Issue Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full min-h-11 px-4 py-3 border border-[var(--dashboard-border)] rounded-xl bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent transition-all"
                placeholder="Brief description of the issue"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                Description <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                className="w-full px-4 py-3 border border-[var(--dashboard-border)] rounded-xl bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent resize-none transition-all"
                placeholder="Please provide detailed information about the issue..."
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                Priority Level
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full min-h-11 px-4 py-3 border border-[var(--dashboard-border)] rounded-xl bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent transition-all appearance-none cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="low">Low - Minor issue</option>
                <option value="medium">Medium - Standard issue</option>
                <option value="high">High - Important issue</option>
                <option value="urgent">Urgent - Critical issue</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(formData.priority)}`}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="photo" className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                Screenshot (Optional)
              </label>
              {photoPreview ? (
                <div className="relative border-2 border-dashed border-[var(--dashboard-border)] rounded-xl p-4 bg-[var(--dashboard-bg)]">
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-contain rounded-lg mb-3" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--dashboard-muted)] min-w-0">
                      <ImageIcon size={16} className="shrink-0" />
                      <span className="truncate max-w-full">{photo?.name}</span>
                      {photo?.size != null && (
                        <span className="text-xs shrink-0">({(photo.size / 1024 / 1024).toFixed(2)} MB)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="min-h-10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-start sm:self-center"
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="photo"
                  className="flex flex-col items-center justify-center w-full min-h-[8rem] border-2 border-dashed border-[var(--dashboard-border)] rounded-xl bg-[var(--dashboard-bg)] hover:border-[var(--dashboard-primary)]/50 hover:bg-[var(--dashboard-primary)]/5 cursor-pointer transition-all group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-2 text-center">
                    <Upload className="w-8 h-8 mb-2 text-[var(--dashboard-muted)] group-hover:text-[var(--dashboard-primary)] transition-colors" />
                    <p className="mb-2 text-sm text-[var(--dashboard-muted)]">
                      <span className="font-semibold text-[var(--dashboard-text)]">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-[var(--dashboard-muted)]">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col-reverse gap-3 border-t border-[var(--dashboard-border)] p-4 sm:flex-row sm:space-x-3 sm:space-y-0">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 flex-1 px-4 py-3 border border-[var(--dashboard-border)] rounded-xl text-[var(--dashboard-text)] bg-[var(--dashboard-card)] hover:bg-[var(--dashboard-border)]/50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 flex-1 px-4 py-3 bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary-hover)] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Submit Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default ReportIssueModal
