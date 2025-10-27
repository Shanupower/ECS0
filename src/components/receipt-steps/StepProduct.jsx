import React, { useState, useMemo } from 'react'
import SearchableSelect from '../SearchableSelect.jsx'
import mfSchemes from '../../data/mf_schemes.json'
import nonMfIssuers from '../../data/non_mf_issuers.json'
import insuranceIssuers from '../../data/insurance_issuers.json'

function StepProduct({ onBack, onNext, investmentType, productType }) {
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
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'} | <strong>Investment Type:</strong> {investmentType}
        </p>
      </div>

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

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => {
            let normalized = {}
            
            // Validate required fields based on product type
            if (product === 'MF') {
              if (!mfIssuer) {
                alert('Please select an issuer company (AMC)')
                return
              }
              if (!mfScheme) {
                alert('Please select a scheme')
                return
              }
              if (!mfInvestmentAmount || parseFloat(mfInvestmentAmount) <= 0) {
                alert('Please enter a valid investment amount')
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
                alert('Please select a company')
                return
              }
              if (!fdScheme) {
                alert('Please select a scheme')
                return
              }
              if (!fdInvestmentAmount || parseFloat(fdInvestmentAmount) <= 0) {
                alert('Please enter a valid deposit amount')
                return
              }
              if (!fdDepositPeriod) {
                alert('Please enter deposit period')
                return
              }
              if (!fdRoi || parseFloat(fdRoi) <= 0) {
                alert('Please enter a valid interest rate')
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
                mode: 'Lump Sum',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: fdApplicationNo || `FD-${Date.now()}`
              }
            } else if (product === 'INS') {
              if (!insIssuer) {
                alert('Please select an insurance company')
                return
              }
              if (!insCategory) {
                alert('Please select an insurance category')
                return
              }
              if (!insProduct) {
                alert('Please select an insurance product')
                return
              }
              if (!insPremiumAmount || parseFloat(insPremiumAmount) <= 0) {
                alert('Please enter a valid premium amount')
                return
              }
              
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
              if (!bondIssuer) {
                alert('Please select an issuer company')
                return
              }
              if (!bondScheme) {
                alert('Please select a bond scheme')
                return
              }
              if (!bondInvestmentAmount || parseFloat(bondInvestmentAmount) <= 0) {
                alert('Please enter a valid investment amount')
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
                mode: 'Lump Sum',
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

