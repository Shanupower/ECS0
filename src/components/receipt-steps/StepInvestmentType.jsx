import React, { useMemo, useState } from 'react'

export default function StepInvestmentType({ onBack, onNext, productType, hasExistingFolio, amcCategory = 'MF', initialType = '' }) {
  const [investmentType, setInvestmentType] = useState(initialType)

  const allInvestmentTypes = [
    { 
      value: 'Lumpsum', 
      label: 'Lump Sum', 
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

  const allowedByCategory = useMemo(() => {
    if (amcCategory === 'SIF') {
      // SIF: SIP only when investor has an existing folio
      return hasExistingFolio === false ? ['Lumpsum'] : ['Lumpsum', 'SIP']
    }
    if (amcCategory === 'PMS' || amcCategory === 'AIF' || amcCategory === 'GIFT_CITY_FUNDS') return ['Lumpsum']
    return null // MF default behavior unchanged
  }, [amcCategory, hasExistingFolio])

  // Category restrictions first, folio rules second (only when unrestricted category)
  const investmentTypes = useMemo(() => {
    let list = allInvestmentTypes
    if (allowedByCategory) {
      list = list.filter(t => allowedByCategory.includes(t.value))
    } else if (hasExistingFolio === false) {
      list = list.filter(t => t.value === 'Lumpsum' || t.value === 'SIP')
    }
    return list
  }, [allInvestmentTypes, allowedByCategory, hasExistingFolio])

  return (
    <div className="receipt-step-card py-2">
      <h3 className="receipt-step-title mt-0 mb-1">Step 5 — Select Investment Type</h3>
      <div className="mb-4 p-3 rounded-xl border border-[var(--dashboard-primary)]/30 bg-[var(--dashboard-primary)]/10">
        <p className="text-[var(--text-body)] text-[var(--dashboard-text)]">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'}
        </p>
      </div>
      <p className="receipt-step-helper mb-6">Choose how you want to invest in this product</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {investmentTypes.map(type => {
          if (!type.available) return null
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setInvestmentType(type.value)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                investmentType === type.value 
                  ? 'border-[var(--dashboard-primary)] bg-[var(--dashboard-primary)]/10 shadow-md' 
                  : 'border-[var(--dashboard-border)] bg-[var(--dashboard-card)] hover:border-[var(--dashboard-muted)]'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{type.icon}</div>
                <h4 className="font-semibold text-[var(--dashboard-text)] mb-1">{type.label}</h4>
                <p className="receipt-step-helper leading-tight">{type.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <button type="button" className="receipt-step-ghost-btn px-4 py-2.5 text-sm font-medium" onClick={onBack}>Back</button>
        <button type="button" className="receipt-step-primary-btn px-4 py-2.5 text-sm" onClick={() => onNext(investmentType)} disabled={!investmentType}>
          Continue
        </button>
      </div>
    </div>
  )
}

