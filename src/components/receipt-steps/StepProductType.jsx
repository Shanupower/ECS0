import React, { useState } from 'react'

function StepProductType({ onBack, onNext, presetsByType = {}, usePreset = true, onTogglePreset = null }) {
  const [productType, setProductType] = useState('')

  const productTypes = [
    { 
      value: 'MF', 
      label: 'Mutual Funds', 
      icon: '📈',
      description: 'Invest in diversified portfolios managed by professionals',
      enabled: true
    },
    { 
      value: 'INS', 
      label: 'Insurance', 
      icon: '🛡️',
      description: 'Protect your future with life and health insurance',
      enabled: true
    },
    { 
      value: 'FD', 
      label: 'Fixed Deposit', 
      icon: '🏦',
      description: 'Secure fixed returns with guaranteed interest rates',
      enabled: true
    },
    { 
      value: 'GOVT_FD', 
      label: 'Government schemes', 
      icon: '🏛️',
      description: 'Post Office and other government savings schemes',
      enabled: true
    },
    { 
      value: 'BOND', 
      label: 'Bonds/NCD', 
      icon: '📊',
      description: 'Government and corporate bonds / NCD for stable returns',
      enabled: true
    },
    { 
      value: 'MISC', 
      label: 'Misc Services', 
      icon: '🔧',
      description: 'Various services and miscellaneous transactions',
      enabled: true
    }
  ]

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 3 — Select Product Type</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose the type of financial product you want to invest in</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {productTypes.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => type.enabled && setProductType(type.value)}
            disabled={!type.enabled}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
              !type.enabled 
                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 opacity-60 cursor-not-allowed'
                : productType === type.value 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md hover:shadow-lg' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
            }`}
          >
            {!type.enabled && (
              <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                Coming Soon
              </div>
            )}
            <div className="text-center">
              <div className="text-4xl mb-3">{type.icon}</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{type.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
            </div>
          </button>
        ))}
      </div>

      {productType && presetsByType[productType] && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <label className="flex items-center gap-3 text-sm text-yellow-800 dark:text-yellow-200">
            <input
              type="checkbox"
              checked={usePreset}
              onChange={() => onTogglePreset && onTogglePreset(!usePreset)}
              className="w-4 h-4 text-yellow-600"
            />
            Use preset for {presetsByType[productType]?.label || productType}
          </label>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => onNext(productType)}
          disabled={!productType}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default StepProductType

