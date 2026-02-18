import React, { useState, useMemo, useEffect } from 'react'
import SearchableSelect from '../SearchableSelect.jsx'
import { api } from '../../api'
import mfSchemes from '../../data/mf_schemes.json'
import nonMfIssuers from '../../data/non_mf_issuers.json'

function StepProduct({ onBack, onNext, investmentType, productType, token }) {
  const [product, setProduct] = useState(productType)
  
  // MF states
  const [mfIssuer, setMfIssuer] = useState('')
  const [mfScheme, setMfScheme] = useState('')
  const [mfInvestmentAmount, setMfInvestmentAmount] = useState('')
  const [mfFolioPolicyNo, setMfFolioPolicyNo] = useState('')
  const [mfSchemeOption, setMfSchemeOption] = useState('Growth')
  const [mfPeriod, setMfPeriod] = useState('')
  const [mfOldIssuer, setMfOldIssuer] = useState('')
  const [mfOldScheme, setMfOldScheme] = useState('')
  
  // FD states
  const [fdIssuer, setFdIssuer] = useState('')
  const [fdScheme, setFdScheme] = useState('')
  const [fdInvestmentAmount, setFdInvestmentAmount] = useState('')
  const [fdApplicationNo, setFdApplicationNo] = useState('')
  const [fdClientType, setFdClientType] = useState('Individual')
  const [fdDepositPeriod, setFdDepositPeriod] = useState('')
  const [fdRoi, setFdRoi] = useState('')
  
  // Insurance states
  const [insuranceIssuers, setInsuranceIssuers] = useState([])
  const [insIssuerKey, setInsIssuerKey] = useState('')
  const [insSelectedIssuer, setInsSelectedIssuer] = useState(null)
  const [insCategory, setInsCategory] = useState('')
  const [insProductId, setInsProductId] = useState('')
  const [insSelectedProduct, setInsSelectedProduct] = useState(null)
  const [insRiders, setInsRiders] = useState([])
  const [insSelectedRiders, setInsSelectedRiders] = useState([])
  const [insPremiumAmount, setInsPremiumAmount] = useState('')
  const [insPolicyNo, setInsPolicyNo] = useState('')
  const [insDateOfIssue, setInsDateOfIssue] = useState('')
  const [insRenewalDate, setInsRenewalDate] = useState('')
  const [insSumAssured, setInsSumAssured] = useState('')
  const [insTerm, setInsTerm] = useState('')
  const [insPremiumPayTerm, setInsPremiumPayTerm] = useState('')
  const [insPaymentSchedule, setInsPaymentSchedule] = useState('')
  const [insuranceLoading, setInsuranceLoading] = useState(false)
  const [ridersLoading, setRidersLoading] = useState(false)
  
  // Bond states
  const [bondIssuer, setBondIssuer] = useState('')
  const [bondScheme, setBondScheme] = useState('')
  const [bondInvestmentAmount, setBondInvestmentAmount] = useState('')
  const [bondApplicationNo, setBondApplicationNo] = useState('')
  const [validationError, setValidationError] = useState('')

  const mfIssuerOptions = useMemo(() => mfSchemes.map(a => ({ label: a.company, value: a.company })), [])
  const mfSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfIssuer])

  const mfOldSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfOldIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfOldIssuer])
  
  const nonMfIssuerOptions = useMemo(() => nonMfIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const fdSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === fdIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [fdIssuer])
  
  const bondSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === bondIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [bondIssuer])
  
  // Load insurance issuers from API
  useEffect(() => {
    if (productType === 'INS' && token) {
      setInsuranceLoading(true)
      api.listInsuranceIssuers(token)
        .then(data => {
          setInsuranceIssuers(Array.isArray(data) ? data : [])
          setInsuranceLoading(false)
        })
        .catch(error => {
          console.error('Failed to load insurance issuers:', error)
          setInsuranceIssuers([])
          setInsuranceLoading(false)
        })
    }
  }, [productType, token])
  
  // Insurance dropdown options
  const insIssuerOptions = useMemo(() => 
    insuranceIssuers.map(issuer => ({ 
      label: issuer.short_name || issuer.legal_name, 
      value: issuer._key 
    })), 
    [insuranceIssuers]
  )
  
  const insCategoryOptions = useMemo(() => {
    if (!insSelectedIssuer || !insSelectedIssuer.products) return []
    // Get unique categories from products
    const categories = new Set()
    insSelectedIssuer.products.forEach(product => {
      if (product.is_active && product.category) {
        categories.add(product.category)
      }
    })
    return Array.from(categories).map(cat => ({ label: cat, value: cat }))
  }, [insSelectedIssuer])
  
  const insProductOptions = useMemo(() => {
    if (!insSelectedIssuer || !insSelectedIssuer.products || !insCategory) return []
    // Filter products by category
    const filteredProducts = insSelectedIssuer.products.filter(
      product => product.is_active && product.category === insCategory
    )
    return filteredProducts.map(product => ({
      label: product.product_name,
      value: product.product_id
    }))
  }, [insSelectedIssuer, insCategory])
  
  // Update selected issuer when issuer key changes
  useEffect(() => {
    if (insIssuerKey) {
      const issuer = insuranceIssuers.find(i => i._key === insIssuerKey)
      setInsSelectedIssuer(issuer || null)
      if (!issuer) {
        setInsCategory('')
        setInsProductId('')
        setInsSelectedProduct(null)
      }
    } else {
      setInsSelectedIssuer(null)
      setInsCategory('')
      setInsProductId('')
      setInsSelectedProduct(null)
    }
  }, [insIssuerKey, insuranceIssuers])

  // Update selected product when product ID changes
  useEffect(() => {
    if (insSelectedIssuer && insProductId) {
      const product = insSelectedIssuer.products?.find(p => p.product_id === insProductId)
      setInsSelectedProduct(product || null)
    } else {
      setInsSelectedProduct(null)
    }
  }, [insSelectedIssuer, insProductId])

  // Load riders when product is selected
  useEffect(() => {
    if (insIssuerKey && insProductId && token) {
      setRidersLoading(true)
      api.getInsuranceRiders(token, insIssuerKey, insProductId)
        .then(data => {
          setInsRiders(Array.isArray(data) ? data.filter(r => r.is_active !== false) : [])
          setRidersLoading(false)
        })
        .catch(error => {
          console.error('Failed to load insurance riders:', error)
          setInsRiders([])
          setRidersLoading(false)
        })
    } else {
      setInsRiders([])
      setInsSelectedRiders([])
    }
  }, [insIssuerKey, insProductId, token])

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
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'} | <strong>Investment Type:</strong> {investmentType}
        </p>
      </div>

      {validationError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
          {validationError}
        </div>
      )}

      {product === 'MF' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Mutual Fund</h3>
          
          {/* Common fields for all investment types */}
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
          </div>

          {/* Switch Over - Special case with old and new scheme */}
          {investmentType === 'Switch Over' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme (AMC)</label>
                <SearchableSelect
                  options={mfIssuerOptions}
                  value={mfOldIssuer}
                  onChange={(v)=>{ setMfOldIssuer(v); setMfOldScheme('') }}
                  placeholder="Select Old AMC"
                />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme</label>
                <SearchableSelect
                  options={mfOldSchemeOptions}
                  value={mfOldScheme}
                  onChange={setMfOldScheme}
                  placeholder="Select Old scheme"
                  disabled={!mfOldIssuer}
                />
              </div>
            </div>
          )}

          {/* Dynamic fields based on investment type */}
          {investmentType === 'Lumpsum' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          )}

          {investmentType === 'SIP' && (
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'SWP' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'STP' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'NFO' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'Additional Purchase' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Existing Folio Number</label>
                <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'Switch Over' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme (AMC)</label>
                <SearchableSelect
                  options={mfIssuerOptions}
                  value={mfOldIssuer}
                  onChange={(v)=>{ setMfOldIssuer(v); setMfOldScheme('') }}
                  placeholder="Select Old AMC"
                />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme</label>
                <SearchableSelect
                  options={mfOldSchemeOptions}
                  value={mfOldScheme}
                  onChange={setMfOldScheme}
                  placeholder="Select Old scheme"
                  disabled={!mfOldIssuer}
                />
              </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Folio Number</label>
              <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
            </div>
          )}
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
          {insuranceLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading insurance data...</span>
            </div>
          ) : (
            <>
              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
                  <SearchableSelect
                    options={insIssuerOptions}
                    value={insIssuerKey}
                    onChange={(v)=>{ setInsIssuerKey(v); setInsCategory(''); setInsProductId('') }}
                    placeholder="Select insurer"
                  />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Category</label>
                  <SearchableSelect
                    options={insCategoryOptions}
                    value={insCategory}
                    onChange={(v)=>{ setInsCategory(v); setInsProductId('') }}
                    placeholder="Select category"
                    disabled={!insIssuerKey}
                  />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Product</label>
                  <SearchableSelect
                    options={insProductOptions}
                    value={insProductId}
                    onChange={setInsProductId}
                    placeholder="Select product"
                    disabled={!insCategory}
                  />
                </div>
              </div>
              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Date of Issue</label>
                  <input type="date" value={insDateOfIssue} onChange={e=>setInsDateOfIssue(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Renewal Date</label>
                  <input type="date" value={insRenewalDate} onChange={e=>setInsRenewalDate(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy No</label>
                  <input value={insPolicyNo} onChange={e=>setInsPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Amount</label>
                  <input type="number" inputMode="decimal" value={insPremiumAmount} onChange={e=>setInsPremiumAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Sum Assured</label>
                  <input type="number" inputMode="decimal" value={insSumAssured} onChange={e=>setInsSumAssured(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Term (Years)</label>
                  <input type="number" inputMode="numeric" value={insTerm} onChange={e=>setInsTerm(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Pay Term (Years)</label>
                  <input type="number" inputMode="numeric" value={insPremiumPayTerm} onChange={e=>setInsPremiumPayTerm(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col" style={{ flex:'1 1 320px' }}>
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Payment Schedule</label>
                  <SearchableSelect
                    options={[
                      { label: 'Annual', value: 'Annual' },
                      { label: 'Half-Yearly', value: 'Half-Yearly' },
                      { label: 'Quarterly', value: 'Quarterly' },
                      { label: 'Monthly', value: 'Monthly' },
                      { label: 'Single', value: 'Single' }
                    ]}
                    value={insPaymentSchedule}
                    onChange={setInsPaymentSchedule}
                    placeholder="Select payment schedule"
                  />
                </div>
              </div>
              
              {/* Riders Selection */}
              {insProductId && (
                <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                  <div className="col" style={{ flex: '1 1 100%' }}>
                    <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2 block">Riders (Optional)</label>
                    {ridersLoading ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">Loading riders...</div>
                    ) : insRiders.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">No riders available for this product</div>
                    ) : (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                        <div className="space-y-3">
                          {insRiders.map((rider) => (
                            <label key={rider.rider_id} className="flex items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={insSelectedRiders.includes(rider.rider_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInsSelectedRiders([...insSelectedRiders, rider.rider_id])
                                  } else {
                                    setInsSelectedRiders(insSelectedRiders.filter(id => id !== rider.rider_id))
                                  }
                                }}
                                className="mt-1 mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{rider.rider_name}</div>
                                {rider.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rider.description}</div>
                                )}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {rider.rider_type && <span>Type: {rider.rider_type}</span>}
                                  {rider.rider_premium_percentage && <span className="ml-2">Premium: {rider.rider_premium_percentage}%</span>}
                                  {rider.rider_premium_fixed && <span className="ml-2">Premium: ₹{rider.rider_premium_fixed.toLocaleString()}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => {
            setValidationError('')
            let normalized = {}
            
            // Validate required fields based on product type
            if (product === 'MF') {
              if (!mfIssuer) {
                setValidationError('Please select an issuer company (AMC)')
                return
              }
              if (!mfScheme) {
                setValidationError('Please select a scheme')
                return
              }
              if (!mfInvestmentAmount || parseFloat(mfInvestmentAmount) <= 0) {
                setValidationError('Please enter a valid investment amount')
                return
              }
              
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
              if (!fdIssuer) {
                setValidationError('Please select a company')
                return
              }
              if (!fdScheme) {
                setValidationError('Please select a scheme')
                return
              }
              if (!fdInvestmentAmount || parseFloat(fdInvestmentAmount) <= 0) {
                setValidationError('Please enter a valid deposit amount')
                return
              }
              if (!fdDepositPeriod) {
                setValidationError('Please enter deposit period')
                return
              }
              if (!fdRoi || parseFloat(fdRoi) <= 0) {
                setValidationError('Please enter a valid interest rate')
                return
              }
              
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
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: fdApplicationNo || `FD-${Date.now()}`
              }
            } else if (product === 'INS') {
              if (!insIssuerKey) {
                setValidationError('Please select an insurance company')
                return
              }
              if (!insCategory) {
                setValidationError('Please select an insurance category')
                return
              }
              if (!insProductId) {
                setValidationError('Please select an insurance product')
                return
              }
              if (!insPremiumAmount || parseFloat(insPremiumAmount) <= 0) {
                setValidationError('Please enter a valid premium amount')
                return
              }
              
              const selectedProduct = insSelectedIssuer?.products?.find(p => p.product_id === insProductId)
              
              // Get rider names and premium details for selected riders
              const selectedRiderNames = insSelectedRiders.length > 0 
                ? insRiders
                    .filter(rider => insSelectedRiders.includes(rider.rider_id))
                    .map(rider => ({ 
                      id: rider.rider_id, 
                      name: rider.rider_name,
                      premium_percentage: rider.rider_premium_percentage || null,
                      premium_fixed: rider.rider_premium_fixed || null
                    }))
                : []
              
              normalized = {
                product_category: 'INS',
                issuerCompany: insSelectedIssuer?.short_name || insSelectedIssuer?.legal_name || '',
                issuerCategory: insCategory,
                schemeName: selectedProduct?.product_name || '',
                investmentAmount: parseFloat(insPremiumAmount) || 0,
                folioPolicyNo: insPolicyNo,
                insurance_issuer_key: insIssuerKey,
                insurance_product_id: insProductId,
                insurance_selected_riders: insSelectedRiders.length > 0 ? insSelectedRiders : null,
                insurance_selected_riders_details: selectedRiderNames.length > 0 ? selectedRiderNames : null,
                insurance_date_of_issue: insDateOfIssue || null,
                insurance_renewal_date: insRenewalDate || null,
                insurance_sum_assured: insSumAssured ? parseFloat(insSumAssured) : null,
                insurance_term: insTerm ? parseFloat(insTerm) : null,
                insurance_premium_pay_term: insPremiumPayTerm ? parseFloat(insPremiumPayTerm) : null,
                insurance_payment_schedule: insPaymentSchedule || null,
                insurance_money_back: selectedProduct?.money_back || false,
                txnType: 'Fresh',
                schemeOption: insPaymentSchedule || 'Annual',
                instrumentType: 'Policy',
                instrumentNo: insPolicyNo || `INS-${Date.now()}`
              }
            } else if (product === 'BOND') {
              if (!bondIssuer) {
                setValidationError('Please select an issuer company')
                return
              }
              if (!bondScheme) {
                setValidationError('Please select a bond scheme')
                return
              }
              if (!bondInvestmentAmount || parseFloat(bondInvestmentAmount) <= 0) {
                setValidationError('Please enter a valid investment amount')
                return
              }
              
              normalized = {
                product_category: 'BOND',
                issuerCompany: bondIssuer,
                issuerCategory: 'Bonds',
                schemeName: bondScheme,
                investmentAmount: parseFloat(bondInvestmentAmount) || 0,
                folioPolicyNo: bondApplicationNo,
                txnType: 'Fresh',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: bondApplicationNo || `BOND-${Date.now()}`
              }
            }
            
            onNext(product, normalized)
          }}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default StepProduct

