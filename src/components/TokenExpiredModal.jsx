import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiAlertCircle, FiLogIn } from 'react-icons/fi'
import { Modal } from './ui/Modal'

const TokenExpiredModal = ({ isOpen, onClose }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    onClose()
    navigate('/login')
  }

  return (
    <Modal open={isOpen} onClose={handleLogout} variant="legacy" size="md" closeOnBackdrop={false}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
            <FiAlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Session Expired
        </h2>
        <p className="text-gray-600 dark:text-dark-300 text-center mb-6 text-sm px-1">
          Your session has expired for security reasons. Please log in again to continue.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200 flex items-center justify-center font-semibold gap-2"
          >
            <FiLogIn className="h-5 w-5 shrink-0" />
            Go to Login
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default TokenExpiredModal
