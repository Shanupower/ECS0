import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepMiscDetails({ onBack, onNext, token, initialData }) {
  const [serviceName, setServiceName] = useState(initialData?.serviceName || '')
  const [servicePrice, setServicePrice] = useState(initialData?.servicePrice || '')
  const [cc, setCc] = useState(0)
  const [si, setSi] = useState(0)
  const [ccPercent, setCcPercent] = useState(0)
  const [siPercent, setSiPercent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate CC/SI when price changes
  useEffect(() => {
    const calculateCCSI = async () => {
      if (!servicePrice || parseFloat(servicePrice) <= 0 || !token) {
        setCc(0)
        setSi(0)
        setCcPercent(0)
        setSiPercent(0)
        return
      }

      try {
        setLoading(true)
        setError('')
        const result = await api.calculateMiscServicesCCSI(token, parseFloat(servicePrice))
        setCc(result.cc || 0)
        setSi(result.si || 0)
        setCcPercent(result.cc_percent || 0)
        setSiPercent(result.si_percent || 0)
      } catch (err) {
        console.error('Failed to calculate CC/SI:', err)
        setError('Failed to calculate commission. Please check price ranges in scheme management.')
        setCc(0)
        setSi(0)
        setCcPercent(0)
        setSiPercent(0)
      } finally {
        setLoading(false)
      }
    }

    // Debounce calculation
    const timeoutId = setTimeout(() => {
      calculateCCSI()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [servicePrice, token])

  const handleNext = () => {
    if (!serviceName.trim()) {
      setError('Service name is required')
      return
    }
    if (!servicePrice || parseFloat(servicePrice) <= 0) {
      setError('Service price must be greater than 0')
      return
    }

    onNext({
      service_name: serviceName.trim(),
      service_price: parseFloat(servicePrice),
      cc,
      si,
      investment_amount: parseFloat(servicePrice),
      _formState: { serviceName: serviceName.trim(), servicePrice }
    })
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Misc Services Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Enter the service name and price</p>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value)
              setError('')
            }}
            placeholder="e.g., Consultation Fee, Advisory Service, etc."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Service Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={servicePrice}
            onChange={(e) => {
              setServicePrice(e.target.value)
              setError('')
            }}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

      </div>

      <div className="actions" style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onBack}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!serviceName.trim() || !servicePrice || parseFloat(servicePrice) <= 0}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
