import React from 'react'
import MultiStepReceipt from '../components/MultiStepReceipt.jsx'
import { FiFileText } from 'react-icons/fi'

export default function ReceiptsPage(){
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <FiFileText className="w-6 h-6 text-red-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Receipt</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate a new financial receipt</p>
        </div>
      </div>
      <MultiStepReceipt />
    </div>
  )
}
