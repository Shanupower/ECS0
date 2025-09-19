import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { FiPlus, FiX, FiUpload, FiFile, FiTrash2 } from 'react-icons/fi'

import investorsData from '../data/investors.json'
import empData from '../data/empdata.json'
import mfSchemes from '../data/mf_schemes.json'
import nonMfIssuers from '../data/non_mf_issuers.json'
import insuranceIssuers from '../data/insurance_issuers.json'

function genReceiptNo() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ECS-${y}${m}${day}-${rand}`
}

function StepHeader({ step }) {
  const pct = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100
  return (
    <div className="stepper-wrap" style={{ margin: '4px 0 10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {[
          ['Employee', 1],
          ['Investor', 2],
          ['Product', 3],
          ['Preview', 4],
        ].map(([label, n], i) => (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`w-7 h-7 rounded-full grid place-items-center font-bold text-xs border shadow-sm ${
                  step === n 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700'
                }`}
              >
                {n}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{label}</div>
            </div>
            {i < 3 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 min-w-6" />}
          </React.Fragment>
        ))}
      </div>
      <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mt-3">
        <span className="block h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-300 ease-out" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function StepEmployee({ user, onNext }) {
  // Auto-populate from user context
  const code = user?.emp_code || ''
  const employeeName = user?.name || ''
  const branch = user?.branch || ''
  
  const index = useMemo(() => {
    const m = new Map()
    ;(empData || []).forEach(e => m.set(String(e.Code || '').trim().toUpperCase(), e))
    return m
  }, [])
  const found = index.get(String(code || '').trim().toUpperCase())

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 1 — Employee</h3>
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column' }}>
          <label className="text-sm text-gray-600 dark:text-gray-400 my-2 font-semibold">Employee Code</label>
          <input
            value={code}
            readOnly
            placeholder="e.g., ECS497"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-900 dark:text-gray-100"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">Auto-filled from your login credentials.</div>
        </div>
      </div>

      {code && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Employee Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Name</label>
              <div className="text-gray-900 dark:text-gray-100">{employeeName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Branch</label>
              <div className="text-gray-900 dark:text-gray-100">{branch || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Email</label>
              <div className="text-gray-900 dark:text-gray-100">{user?.email || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => onNext({ empCode: code || '', employeeName: employeeName || '', branch: branch || '' })}
          disabled={!code}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepInvestor({ onBack, onFound }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    investorName: '',
    investorAddress: '',
    pinCode: '',
    pan: '',
    email: ''
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCustomer = () => {
    if (!newCustomer.investorName.trim()) {
      alert('Customer name is required')
      return
    }
    
    setIsCreating(true)
    try {
      // Check for duplicates
      const trimmedName = newCustomer.investorName.trim().toLowerCase()
      const trimmedPan = newCustomer.pan.trim().toLowerCase()
      const trimmedEmail = newCustomer.email.trim().toLowerCase()
      
      const duplicateCheck = investorsData.find(inv => {
        const existingName = (inv.investorName || '').toLowerCase()
        const existingPan = (inv.pan || '').toLowerCase()
        const existingEmail = (inv.email || '').toLowerCase()
        
        return (trimmedName && existingName === trimmedName) ||
               (trimmedPan && existingPan === trimmedPan) ||
               (trimmedEmail && existingEmail === trimmedEmail)
      })
      
      if (duplicateCheck) {
        alert('Customer already exists with the same name, PAN, or email!')
        setIsCreating(false)
        return
      }
      
      // Generate a new investor ID (simple increment from max existing ID)
      const maxId = Math.max(...investorsData.map(inv => inv.investorId || 0))
      const newInvestorId = maxId + 1
      
      const customerData = {
        investorId: newInvestorId,
        investorName: newCustomer.investorName.trim(),
        investorAddress: newCustomer.investorAddress.trim(),
        pinCode: parseInt(newCustomer.pinCode) || 0,
        pan: newCustomer.pan.trim(),
        email: newCustomer.email.trim()
      }
      
      // Save to localStorage (since we don't have backend)
      const existingCustomers = JSON.parse(localStorage.getItem('local_customers') || '[]')
      existingCustomers.push(customerData)
      localStorage.setItem('local_customers', JSON.stringify(existingCustomers))
      
      // Select the newly created customer
      setSelected(customerData)
      setShowCreateForm(false)
      setNewCustomer({
        investorName: '',
        investorAddress: '',
        pinCode: '',
        pan: '',
        email: ''
      })
      
      alert('Customer created successfully!')
    } catch (err) {
      alert('Failed to create customer: ' + err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const results = useMemo(() => {
    const data = Array.isArray(investorsData) ? investorsData : []
    const localCustomers = JSON.parse(localStorage.getItem('local_customers') || '[]')
    const allData = [...data, ...localCustomers]
    
    const query = String(q || '').trim().toLowerCase()
    if (!query) return allData.slice(0, 25)
    const isNumeric = /^\d+$/.test(query)
    return allData
      .filter(it => {
        const id = String(it.investorId ?? '').toLowerCase()
        const name = String(it.investorName ?? '').toLowerCase()
        const addr = String(it.investorAddress ?? '').toLowerCase()
        const pan = String(it.pan ?? '').toLowerCase()
        const email = String(it.email ?? '').toLowerCase()
        if (isNumeric) return id.includes(query) || name.includes(query) || addr.includes(query) || pan.includes(query) || email.includes(query)
        return name.includes(query) || addr.includes(query) || pan.includes(query) || email.includes(query) || id.includes(query)
      })
      .slice(0, 50)
  }, [q])

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 2 — Investor</h3>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px' }}>
          <label className="text-sm text-gray-600 dark:text-gray-400 my-2 font-semibold">
            Search Investor (ID / Name / Address / PAN / Email)
          </label>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Type any part of ID, name, address, PAN, or email"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">Results limited to 50 matches.</div>
        </div>
      </div>

      {/* Create New Customer Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-red-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-red-300 bg-blue-50 dark:bg-red-900/40 hover:bg-blue-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'Create New Customer'}
        </button>
      </div>

      {/* Create New Customer Form */}
      {showCreateForm && (
        <div className="mt-4 border border-blue-200 dark:border-red-700 rounded-2xl bg-blue-50 dark:bg-red-900/20 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Customer</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.investorName}
                  onChange={e => setNewCustomer(prev => ({ ...prev, investorName: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">PAN Number</label>
                <input
                  type="text"
                  value={newCustomer.pan}
                  onChange={e => setNewCustomer(prev => ({ ...prev, pan: e.target.value }))}
                  placeholder="Enter PAN number"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">PIN Code</label>
                <input
                  type="number"
                  value={newCustomer.pinCode}
                  onChange={e => setNewCustomer(prev => ({ ...prev, pinCode: e.target.value }))}
                  placeholder="Enter PIN code"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Address</label>
              <textarea
                value={newCustomer.investorAddress}
                onChange={e => setNewCustomer(prev => ({ ...prev, investorAddress: e.target.value }))}
                placeholder="Enter complete address"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateCustomer}
                disabled={isCreating || !newCustomer.investorName.trim()}
                className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 text-sm font-semibold rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-semibold rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FiX className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-65 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
        <table className="w-full border-collapse text-sm min-w-160">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">ID</th>
              <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">Name</th>
              <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">PAN</th>
              <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">Email</th>
              <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">PIN</th>
            </tr>
          </thead>
          <tbody>
            {results.map((it, i) => {
              const isSel = selected && String(selected.investorId) === String(it.investorId)
              return (
                <tr
                  key={`${it.investorId}-${i}`}
                  onClick={() => setSelected(it)}
                  className={`cursor-pointer ${isSel ? 'bg-gray-100 dark:bg-gray-600' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.investorId ?? ''}</td>
                  <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.investorName ?? ''}</td>
                  <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.pan ?? ''}</td>
                  <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.email ?? ''}</td>
                  <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.pinCode ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Investor Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">ID</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.investorId || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Name</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.investorName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">PAN</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.pan || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Email</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.email || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">PIN</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.pinCode || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 640px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Address</label>
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selected.investorAddress || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors">
          Back
        </button>
        <button
          onClick={() => onFound({ investorId: selected ? selected.investorId : '', info: selected || null })}
          disabled={!selected}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepProduct({ onBack, onNext }) {
  const [product, setProduct] = useState('MF')
  
  // MF states
  const [mfIssuer, setMfIssuer] = useState('')
  const [mfScheme, setMfScheme] = useState('')
  const [mfInvestmentAmount, setMfInvestmentAmount] = useState('')
  const [mfFolioPolicyNo, setMfFolioPolicyNo] = useState('')
  
  // FD states
  const [fdIssuer, setFdIssuer] = useState('')
  const [fdScheme, setFdScheme] = useState('')
  const [fdInvestmentAmount, setFdInvestmentAmount] = useState('')
  const [fdApplicationNo, setFdApplicationNo] = useState('')
  const [fdClientType, setFdClientType] = useState('Individual')
  const [fdDepositPeriod, setFdDepositPeriod] = useState('')
  const [fdRoi, setFdRoi] = useState('')
  
  // Insurance states
  const [insIssuer, setInsIssuer] = useState('')
  const [insCategory, setInsCategory] = useState('')
  const [insProduct, setInsProduct] = useState('')
  const [insPremiumAmount, setInsPremiumAmount] = useState('')
  const [insPolicyNo, setInsPolicyNo] = useState('')
  
  // Bond states
  const [bondIssuer, setBondIssuer] = useState('')
  const [bondScheme, setBondScheme] = useState('')
  const [bondInvestmentAmount, setBondInvestmentAmount] = useState('')
  const [bondApplicationNo, setBondApplicationNo] = useState('')

  const mfIssuerOptions = useMemo(() => mfSchemes.map(a => ({ label: a.company, value: a.company })), [])
  const mfSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfIssuer])
  
  const nonMfIssuerOptions = useMemo(() => nonMfIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const fdSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === fdIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [fdIssuer])
  
  const bondSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === bondIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [bondIssuer])
  
  const insIssuerOptions = useMemo(() => insuranceIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const insCategoryOptions = useMemo(() => {
    const f = insuranceIssuers.find(x => x.company === insIssuer)
    return f ? f.subsections.map(s => ({ label: s.name, value: s.name })) : []
  }, [insIssuer])
  const insProductOptions = useMemo(() => {
    const f = insuranceIssuers.find(x => x.company === insIssuer)
    const sub = f?.subsections?.find(s => s.name === insCategory)
    return sub ? sub.products.map(p => ({ label: p, value: p })) : []
  }, [insIssuer, insCategory])

  const tile = (val, label) => (
    <button
      type="button"
      onClick={() => setProduct(val)}
      className={`appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 font-bold cursor-pointer transition-colors ${
        product === val 
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
          : 'bg-white/85 dark:bg-gray-800/85 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
      }`}
    >{label}</button>
  )

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 3 — Select Product & Fill Details</h3>
      <div className="actions" style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tile('MF', 'Mutual Fund')}
        {tile('FD', 'Fixed Deposit')}
        {tile('INS', 'Insurance')}
        {tile('BOND', 'Bonds')}
      </div>

      {product === 'MF' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Mutual Fund</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company (AMC)</label>
              <SearchableSelect
                options={mfIssuerOptions}
                value={mfIssuer}
                onChange={(v)=>{ setMfIssuer(v); setMfScheme('') }}
                placeholder="Select AMC"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={mfSchemeOptions}
                value={mfScheme}
                onChange={setMfScheme}
                placeholder="Select scheme"
                disabled={!mfIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Folio Number</label>
              <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      {product === 'FD' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Fixed Deposit</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={fdIssuer}
                onChange={(v)=>{ setFdIssuer(v); setFdScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={fdSchemeOptions}
                value={fdScheme}
                onChange={setFdScheme}
                placeholder="Select scheme/product"
                disabled={!fdIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={fdInvestmentAmount} onChange={e=>setFdInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Application Number</label>
              <input value={fdApplicationNo} onChange={e=>setFdApplicationNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Client Category</label>
              <select value={fdClientType} onChange={e=>setFdClientType(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Individual</option>
                <option>Sr. Citizen</option>
              </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period of Deposit (Y/M)</label>
              <input value={fdDepositPeriod} onChange={e=>setFdDepositPeriod(e.target.value)} placeholder="e.g., 1Y 6M" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Interest Rate (%)</label>
              <input type="text" inputMode="decimal" value={fdRoi} onChange={e=>setFdRoi(e.target.value)} placeholder="e.g., 8.25" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      {product === 'INS' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Insurance</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={insIssuerOptions}
                value={insIssuer}
                onChange={(v)=>{ setInsIssuer(v); setInsCategory(''); setInsProduct('') }}
                placeholder="Select insurer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Sub-section / Category</label>
              <SearchableSelect
                options={insCategoryOptions}
                value={insCategory}
                onChange={(v)=>{ setInsCategory(v); setInsProduct('') }}
                placeholder="Select category"
                disabled={!insIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Product</label>
              <SearchableSelect
                options={insProductOptions}
                value={insProduct}
                onChange={setInsProduct}
                placeholder="Select product"
                disabled={!insCategory}
              />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Amount</label>
              <input type="number" inputMode="decimal" value={insPremiumAmount} onChange={e=>setInsPremiumAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy No</label>
              <input value={insPolicyNo} onChange={e=>setInsPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      {product === 'BOND' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Bonds</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={bondIssuer}
                onChange={(v)=>{ setBondIssuer(v); setBondScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={bondSchemeOptions}
                value={bondScheme}
                onChange={setBondScheme}
                placeholder="Select scheme/product"
                disabled={!bondIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={bondInvestmentAmount} onChange={e=>setBondInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Application Number</label>
              <input value={bondApplicationNo} onChange={e=>setBondApplicationNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors">
          Back
        </button>
        <button
          onClick={() => {
            let normalized = {}
            if (product === 'MF') {
              normalized = {
                product_category: 'MF',
                issuerCompany: mfIssuer,
                issuerCategory: 'Mutual Fund',
                schemeName: mfScheme,
                investmentAmount: parseFloat(mfInvestmentAmount) || 0,
                folioPolicyNo: mfFolioPolicyNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Growth',
                instrumentType: 'Online Ref',
                instrumentNo: mfFolioPolicyNo || `MF-${Date.now()}`
              }
            } else if (product === 'FD') {
              normalized = {
                product_category: 'FD',
                issuerCompany: fdIssuer,
                issuerCategory: 'Fixed Deposit',
                schemeName: fdScheme,
                investmentAmount: parseFloat(fdInvestmentAmount) || 0,
                folioPolicyNo: fdApplicationNo,
                clientType: fdClientType,
                depositPeriodYM: fdDepositPeriod,
                roi: fdRoi,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: fdApplicationNo || `FD-${Date.now()}`
              }
            } else if (product === 'INS') {
              normalized = {
                product_category: 'INS',
                issuerCompany: insIssuer,
                issuerCategory: insCategory,
                schemeName: insProduct,
                investmentAmount: parseFloat(insPremiumAmount) || 0,
                folioPolicyNo: insPolicyNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Annual',
                instrumentType: 'Policy',
                instrumentNo: insPolicyNo || `INS-${Date.now()}`
              }
            } else if (product === 'BOND') {
              normalized = {
                product_category: 'BOND',
                issuerCompany: bondIssuer,
                issuerCategory: 'Bonds',
                schemeName: bondScheme,
                investmentAmount: parseFloat(bondInvestmentAmount) || 0,
                folioPolicyNo: bondApplicationNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: bondApplicationNo || `BOND-${Date.now()}`
              }
            }
            onNext(product, normalized)
          }}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepFinal({ data, onBack, onSave, isSaving, saveError, supportingDocument, setSupportingDocument }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      // Check file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload an image (JPEG, PNG, GIF) or PDF file')
        return
      }
      
      setSupportingDocument(file)
    }
  }

  const removeDocument = () => {
    setSupportingDocument(null)
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Preview & Finish</h3>
      
      {/* Supporting Document Section */}
      <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Supporting Document</h4>
        
        {!supportingDocument ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-red-400 transition-colors">
            <FiUpload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload photo proof or supporting document
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Supported formats: JPEG, PNG, GIF, PDF (Max 5MB)
            </p>
            <label className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-red-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-red-300 bg-blue-50 dark:bg-red-900/40 hover:bg-blue-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
              <FiUpload className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <FiFile className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {supportingDocument.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(supportingDocument.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeDocument}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-semibold rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
            >
              <FiTrash2 className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Receipt Preview */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
        <PrintReceipt data={data} />
      </div>
      
      {saveError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          Error: {saveError}
        </div>
      )}
      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button 
          onClick={onBack} 
          disabled={isSaving}
          className={`appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Back
        </button>
        <button 
          onClick={onSave} 
          disabled={isSaving}
          className={`appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 hover:shadow-md transition-shadow ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? 'Saving...' : 'Save to Server'}
        </button>
      </div>
    </div>
  )
}

export default function MultiStepReceipt() {
  const { token, user } = useAuth()
  const [step, setStep] = useState(1)
  const [empSeed, setEmpSeed] = useState({ empCode: '', employeeName: '', branch: '' })
  const [investorSeed, setInvestorSeed] = useState({ investorId: '', investorInfo: null })
  const [finalData, setFinalData] = useState(null)
  const [supportingDocument, setSupportingDocument] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Auto-populate employee data from user context
  useEffect(() => {
    if (user && !empSeed.empCode) {
      setEmpSeed({
        empCode: user.emp_code || '',
        employeeName: user.name || '',
        branch: user.branch || ''
      })
    }
  }, [user])

  const buildBase = () => {
    const base = {
      receiptNo: genReceiptNo(),
      date: new Date().toISOString().slice(0, 10),
      branch: empSeed.branch || '',
      employeeName: empSeed.employeeName || '',
      empCode: empSeed.empCode || '',
      investorId: investorSeed.investorId || '',
      investorName: '', investorAddress: '', pinCode: '', pan: '', email: '',
      schemeName: '', investmentAmount: '', folioPolicyNo: '',
      mode: 'Lump Sum', txnType: 'Fresh',
      issuerCompany: ''
    }
    if (investorSeed.investorInfo) {
      base.investorName    = investorSeed.investorInfo.investorName || ''
      base.investorAddress = investorSeed.investorInfo.investorAddress || ''
      base.pinCode         = investorSeed.investorInfo.pinCode || ''
      base.pan             = investorSeed.investorInfo.pan || ''
      base.email           = investorSeed.investorInfo.email || ''
    }
    return base
  }

  const saveToServer = async () => {
    if (!token) {
      setSaveError('Not authenticated')
      return
    }
    
    setIsSaving(true)
    setSaveError('')
    
    try {
      const result = await api.createReceipt(token, finalData)
      alert(`Receipt saved successfully! Receipt ID: ${result.id || result.receiptNo}`)
      // Reset form after successful save
      setStep(1)
      setEmpSeed({ empCode: '', employeeName: '', branch: '' })
      setInvestorSeed({ investorId: '', investorInfo: null })
      setFinalData(null)
    } catch (err) {
      setSaveError(err.message || 'Failed to save receipt')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <StepHeader step={step} />

      {step === 1 && (
        <StepEmployee
          user={user}
          onNext={e => { setEmpSeed(e); setStep(2) }}
        />
      )}

      {step === 2 && (
        <StepInvestor
          onBack={() => setStep(1)}
          onFound={r => { setInvestorSeed({ investorId: r.investorId, investorInfo: r.info }); setStep(3) }}
        />
      )}

      {step === 3 && (
        <StepProduct
          onBack={() => setStep(2)}
          onNext={(_, normalized) => {
            const base = buildBase()
            const merged = { ...base, ...normalized }
            setFinalData(merged)
            setStep(4)
          }}
        />
      )}

      {step === 4 && finalData && (
        <StepFinal 
          data={finalData} 
          onBack={() => setStep(3)} 
          onSave={saveToServer}
          isSaving={isSaving}
          saveError={saveError}
          supportingDocument={supportingDocument}
          setSupportingDocument={setSupportingDocument}
        />
      )}
    </div>
  )
}