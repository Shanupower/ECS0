import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

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
                style={{
                  width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center',
                  background: step === n ? '#111' : '#fff', color: step === n ? '#fff' : '#111',
                  border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 6px 14px rgba(0,0,0,.06)',
                  fontWeight: 800, fontSize: 12,
                }}
              >
                {n}
              </div>
              <div style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
            </div>
            {i < 3 && <div style={{ flex: '1 1 40px', height: 1, background: 'rgba(0,0,0,.08)', minWidth: 24 }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ position: 'relative', height: 8, width: '100%', borderRadius: 999, background: 'rgba(0,0,0,.06)', overflow: 'hidden', marginTop: 12 }}>
        <span style={{ display: 'block', height: '100%', width: pct + '%', background: '#111', borderRadius: 999, transition: 'width .28s ease' }} />
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
      <h3 style={{ marginTop: 0 }}>Step 1 — Employee</h3>
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 13, color: '#3b3b3c', margin: '8px 0 6px', fontWeight: 600 }}>Employee Code</label>
          <input
            value={code}
            readOnly
            placeholder="e.g., ECS497"
            style={{ 
              width: '100%', 
              padding: '14px 16px', 
              borderRadius: 14, 
              border: '1px solid rgba(0,0,0,.08)',
              backgroundColor: '#f8f9fa',
              cursor: 'not-allowed'
            }}
          />
          <div className="helper" style={{ fontSize: 12, color: '#6b7280' }}>Auto-filled from your login credentials.</div>
        </div>
      </div>

      {code && (
        <div className="card" style={{ marginTop: 16, border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Employee Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Name</label>
              <div>{employeeName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Branch</label>
              <div>{branch || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Email</label>
              <div>{user?.email || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => onNext({ empCode: code || '', employeeName: employeeName || '', branch: branch || '' })}
          disabled={!code}
          style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', fontWeight: 800, background: 'linear-gradient(180deg,#fff,#f7f7f7)', cursor: 'pointer' }}
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

  const results = useMemo(() => {
    const data = Array.isArray(investorsData) ? investorsData : []
    const query = String(q || '').trim().toLowerCase()
    if (!query) return data.slice(0, 25)
    const isNumeric = /^\d+$/.test(query)
    return data
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
      <h3 style={{ marginTop: 0 }}>Step 2 — Investor</h3>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px' }}>
          <label style={{ fontSize: 13, color: '#3b3b3c', margin: '8px 0 6px', fontWeight: 600 }}>
            Search Investor (ID / Name / Address / PAN / Email)
          </label>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Type any part of ID, name, address, PAN, or email"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(0,0,0,.08)' }}
          />
          <div className="helper" style={{ fontSize: 12, color: '#6b7280' }}>Results limited to 50 matches.</div>
        </div>
      </div>

      <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.03)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>PAN</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>PIN</th>
            </tr>
          </thead>
          <tbody>
            {results.map((it, i) => {
              const isSel = selected && String(selected.investorId) === String(it.investorId)
              return (
                <tr
                  key={`${it.investorId}-${i}`}
                  onClick={() => setSelected(it)}
                  style={{ cursor: 'pointer', background: isSel ? 'rgba(0,0,0,.05)' : 'transparent' }}
                >
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>{it.investorId ?? ''}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>{it.investorName ?? ''}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>{it.pan ?? ''}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>{it.email ?? ''}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>{it.pinCode ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16, border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Investor Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>ID</label>
              <div>{selected.investorId || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Name</label>
              <div>{selected.investorName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>PAN</label>
              <div>{selected.pan || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Email</label>
              <div>{selected.email || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>PIN</label>
              <div>{selected.pinCode || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 640px' }}>
              <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Address</label>
              <div style={{ whiteSpace: 'pre-wrap' }}>{selected.investorAddress || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', background: 'rgba(255,255,255,.85)', fontWeight: 800 }}>
          Back
        </button>
        <button
          onClick={() => onFound({ investorId: selected ? selected.investorId : '', info: selected || null })}
          disabled={!selected}
          style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', fontWeight: 800, background: 'linear-gradient(180deg,#fff,#f7f7f7)', cursor: 'pointer' }}
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
      style={{
        appearance: 'none', border: '1px solid var(--border, rgba(0,0,0,.08))',
        borderRadius: 999, padding: '10px 16px', fontWeight: 800,
        background: product === val ? '#fff' : 'rgba(255,255,255,.85)', cursor: 'pointer'
      }}
    >{label}</button>
  )

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Step 3 — Select Product & Fill Details</h3>
      <div className="actions" style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tile('MF', 'Mutual Fund')}
        {tile('FD', 'Fixed Deposit')}
        {tile('INS', 'Insurance')}
        {tile('BOND', 'Bonds')}
      </div>

      {product === 'MF' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Mutual Fund</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company (AMC)</label>
              <SearchableSelect
                options={mfIssuerOptions}
                value={mfIssuer}
                onChange={(v)=>{ setMfIssuer(v); setMfScheme('') }}
                placeholder="Select AMC"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Scheme</label>
              <SearchableSelect
                options={mfSchemeOptions}
                value={mfScheme}
                onChange={setMfScheme}
                placeholder="Select scheme"
                disabled={!mfIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Folio Number</label>
              <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {product === 'FD' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Fixed Deposit</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={fdIssuer}
                onChange={(v)=>{ setFdIssuer(v); setFdScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Scheme</label>
              <SearchableSelect
                options={fdSchemeOptions}
                value={fdScheme}
                onChange={setFdScheme}
                placeholder="Select scheme/product"
                disabled={!fdIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={fdInvestmentAmount} onChange={e=>setFdInvestmentAmount(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={fdApplicationNo} onChange={e=>setFdApplicationNo(e.target.value)} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Client Category</label>
              <select value={fdClientType} onChange={e=>setFdClientType(e.target.value)}>
                <option>Individual</option>
                <option>Sr. Citizen</option>
              </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Period of Deposit (Y/M)</label>
              <input value={fdDepositPeriod} onChange={e=>setFdDepositPeriod(e.target.value)} placeholder="e.g., 1Y 6M" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Interest Rate (%)</label>
              <input type="text" inputMode="decimal" value={fdRoi} onChange={e=>setFdRoi(e.target.value)} placeholder="e.g., 8.25" />
            </div>
          </div>
        </div>
      )}

      {product === 'INS' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Insurance</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company</label>
              <SearchableSelect
                options={insIssuerOptions}
                value={insIssuer}
                onChange={(v)=>{ setInsIssuer(v); setInsCategory(''); setInsProduct('') }}
                placeholder="Select insurer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Sub-section / Category</label>
              <SearchableSelect
                options={insCategoryOptions}
                value={insCategory}
                onChange={(v)=>{ setInsCategory(v); setInsProduct('') }}
                placeholder="Select category"
                disabled={!insIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Product</label>
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
              <label>Premium Amount</label>
              <input type="number" inputMode="decimal" value={insPremiumAmount} onChange={e=>setInsPremiumAmount(e.target.value)} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Policy No</label>
              <input value={insPolicyNo} onChange={e=>setInsPolicyNo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {product === 'BOND' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Bonds</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={bondIssuer}
                onChange={(v)=>{ setBondIssuer(v); setBondScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Scheme</label>
              <SearchableSelect
                options={bondSchemeOptions}
                value={bondScheme}
                onChange={setBondScheme}
                placeholder="Select scheme/product"
                disabled={!bondIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={bondInvestmentAmount} onChange={e=>setBondInvestmentAmount(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={bondApplicationNo} onChange={e=>setBondApplicationNo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', background: 'rgba(255,255,255,.85)', fontWeight: 800 }}>
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
          style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', fontWeight: 800, background: 'linear-gradient(180deg,#fff,#f7f7f7)', cursor: 'pointer' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepFinal({ data, onBack, onSave, isSaving, saveError }) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Step 4 — Preview & Finish</h3>
      <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
        <PrintReceipt data={data} />
      </div>
      {saveError && (
        <div style={{ marginTop: 16, padding: 12, background: '#fee', border: '1px solid #fcc', borderRadius: 8, color: '#c33' }}>
          Error: {saveError}
        </div>
      )}
      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button 
          onClick={onBack} 
          disabled={isSaving}
          style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', background:'rgba(255,255,255,.85)', fontWeight:800, opacity: isSaving ? 0.6 : 1 }}
        >
          Back
        </button>
        <button 
          onClick={onSave} 
          disabled={isSaving}
          style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', fontWeight:800, background:'linear-gradient(180deg,#fff,#f7f7f7)', opacity: isSaving ? 0.6 : 1 }}
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
        />
      )}
    </div>
  )
}