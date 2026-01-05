import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiAlertCircle, FiLogOut, FiLogIn } from 'react-icons/fi'

const TokenExpiredModal = ({ isOpen, onClose }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    onClose()
    navigate('/login')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
            <FiAlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Session Expired
        </h2>
        
        <p className="text-gray-600 dark:text-dark-300 text-center mb-6">
          Your session has expired for security reasons. Please log in again to continue.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200 flex items-center justify-center font-semibold"
          >
            <FiLogIn className="h-5 w-5 mr-2" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default TokenExpiredModal





