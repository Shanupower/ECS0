import React, { useState, useEffect } from 'react'
import { FiCheck, FiTrendingUp, FiShield, FiPieChart, FiAward, FiTool } from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'

function StepProductType({ onBack, onNext, presetsByType = {}, usePreset = true, onTogglePreset = null, initialType = '' }) {
  const [productType, setProductType] = useState(initialType)

  const productTypes = [
    { value: 'MF', label: 'Mutual Funds', Icon: FiTrendingUp, enabled: true },
    { value: 'INS', label: 'Insurance', Icon: FiShield, enabled: true },
    { value: 'FD', label: 'Fixed Deposit', Icon: FaRupeeSign, enabled: true, iconClass: 'font-extralight' },
    { value: 'BOND', label: 'Bonds/NCD', Icon: FiPieChart, enabled: true },
    { value: 'GOVT_FD', label: 'Government Schemes', Icon: FiAward, enabled: true },
    { value: 'MISC', label: 'Misc Services', Icon: FiTool, enabled: true }
  ]

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && productType && !e.target.matches('input, textarea, select')) {
        e.preventDefault()
        onNext(productType)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [productType, onNext])

  return (
    <div className="receipt-step-card py-2">
      <h3 className="receipt-step-title mt-0 mb-1">Step 3 – Select Product Type</h3>
      <p className="receipt-step-helper mb-4">Choose the type of financial product you want to invest in</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {productTypes.map((type) => {
          const isSelected = productType === type.value
          const Icon = type.Icon
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => type.enabled && setProductType(type.value)}
              disabled={!type.enabled}
              className={`relative flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all duration-200 min-h-[100px] ${
                !type.enabled
                  ? 'border-[var(--dashboard-border)] bg-[var(--dashboard-bg)] opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-[var(--dashboard-primary)] bg-[var(--dashboard-primary)]/10 shadow-md hover:shadow-lg'
                    : 'border-[var(--dashboard-border)] bg-[var(--dashboard-card)] hover:border-[var(--dashboard-muted)] hover:shadow-lg'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--dashboard-primary)] text-white">
                  <FiCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              )}
              {!type.enabled && (
                <div className="absolute top-3 right-3 bg-[var(--warn)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  Coming Soon
                </div>
              )}
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--dashboard-primary)]/10 text-[var(--dashboard-primary)] mb-2">
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
              </div>
              <h4 className="font-semibold text-[var(--dashboard-text)] text-center w-full">{type.label}</h4>
            </button>
          )
        })}
      </div>

      {productType && presetsByType[productType] && (
        <div className="mb-4 rounded-xl border border-[var(--warn)]/40 bg-[var(--warn-muted)] p-4">
          <label className="flex items-center gap-3 text-[var(--dashboard-text)]">
            <input
              type="checkbox"
              checked={usePreset}
              onChange={() => onTogglePreset && onTogglePreset(!usePreset)}
              className="w-4 h-4 rounded border-[var(--dashboard-border)] text-[var(--dashboard-primary)]"
            />
            Use preset for {presetsByType[productType]?.label || productType}
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-between items-center mt-4">
        <button type="button" className="receipt-step-ghost-btn px-4 py-2.5 text-sm font-medium" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="receipt-step-primary-btn px-4 py-2.5 text-sm"
          onClick={() => onNext(productType)}
          disabled={!productType}
        >
          Continue
        </button>
      </div>
      <p className="text-helper text-[var(--text-muted)] mt-2 text-center sm:text-left">Press Enter to continue</p>
    </div>
  )
}

export default StepProductType
