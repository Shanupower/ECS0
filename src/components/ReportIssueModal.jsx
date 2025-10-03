import React, { useState } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'

const ReportIssueModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    issue: '',
    description: ''
  })
  const [screenshot, setScreenshot] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for the screenshot')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setScreenshot(file)
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.issue.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('issue', formData.issue.trim())
      formDataToSend.append('description', formData.description.trim())
      
      if (screenshot) {
        formDataToSend.append('screenshot', screenshot)
      }

      const response = await fetch('/api/issues', {
        method: 'POST',
        body: formDataToSend
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Issue reported successfully! Thank you for your feedback.')
        setFormData({ issue: '', description: '' })
        setScreenshot(null)
        // Reset file input
        const fileInput = document.getElementById('screenshot')
        if (fileInput) fileInput.value = ''
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose()
          setSuccess('')
        }, 2000)
      } else {
        setError(result.detail || 'Failed to submit issue report')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error submitting issue:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ issue: '', description: '' })
    setScreenshot(null)
    setError('')
    setSuccess('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Report an Issue</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="text-red-500" size={20} />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="text-green-500" size={20} />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          <div>
            <label htmlFor="issue" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="issue"
              name="issue"
              value={formData.issue}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the issue"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Please provide detailed information about the issue..."
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot (Optional)
            </label>
            <div className="flex items-center space-x-3">
              <label
                htmlFor="screenshot"
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">Choose File</span>
              </label>
              <input
                type="file"
                id="screenshot"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
              {screenshot && (
                <span className="text-sm text-gray-600 truncate max-w-32">
                  {screenshot.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a screenshot to help us understand the issue better (max 10MB)
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportIssueModal


