import React, { useState } from 'react'

export default function StepInvestmentType({ onBack, onNext, productType, hasExistingFolio }) {
  const [investmentType, setInvestmentType] = useState('')

  const allInvestmentTypes = [
    { 
      value: 'Lumpsum', 
      label: 'Lumpsum', 
      icon: '💰',
      description: 'One-time investment with immediate allocation',
      available: true
    },
    { 
      value: 'SIP', 
      label: 'SIP (Systematic Investment Plan)', 
      icon: '📅',
      description: 'Regular monthly investments for long-term wealth building',
      available: true
    },
    { 
      value: 'SWP', 
      label: 'SWP (Systematic Withdrawal Plan)', 
      icon: '💸',
      description: 'Regular withdrawals from existing investments',
      available: hasExistingFolio === true
    },
    { 
      value: 'STP', 
      label: 'STP (Systematic Transfer Plan)', 
      icon: '🔄',
      description: 'Transfer funds between different schemes systematically',
      available: hasExistingFolio === true
    },
    { 
      value: 'Switch Over', 
      label: 'Switch Over', 
      icon: '🔄',
      description: 'Move from one scheme to another within the same AMC',
      available: hasExistingFolio === true
    }
  ]

  // Filter investment types based on folio status
  const investmentTypes = hasExistingFolio === false 
    ? allInvestmentTypes.filter(t => t.value === 'Lumpsum' || t.value === 'SIP')
    : allInvestmentTypes

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 5 — Select Investment Type</h3>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'}
        </p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose how you want to invest in this product</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {investmentTypes.map(type => {
          if (!type.available) return null
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setInvestmentType(type.value)}
              className={`p-4 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                investmentType === type.value 
                  ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{type.icon}</div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{type.label}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{type.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => onNext(investmentType)}
          disabled={!investmentType}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

