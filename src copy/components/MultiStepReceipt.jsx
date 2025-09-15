import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'

import investorsData from '../data/investors.json'
import empData from '../data/empdata.json'
import mfSchemes from '../data/mf_schemes.json'               // [{ company, schemes: [] }]
import nonMfIssuers from '../data/non_mf_issuers.json'        // [{ company, schemes: [] }]
import insuranceIssuers from '../data/insurance_issuers.json' // [{ company, subsections:[{name, products:[]}] }]

function genReceiptNo() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ECS-${y}${m}${day}-${rand}`
}

/* ---------- Stepper + Progress ---------- */
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

/* ---------- Step 1: Employee ---------- */
function StepEmployee({ value, onNext }) {
  const [code, setCode] = useState(value || '')
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
            onChange={e => setCode(e.target.value)}
            placeholder="e.g., ECS497"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(0,0,0,.08)' }}
          />
          <div className="helper" style={{ fontSize: 12, color: '#6b7280' }}>Auto-fills Employee Name and Branch from emp data.</div>
        </div>
      </div>

      {code && (
        <div className="card" style={{ marginTop: 16, border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Employee Preview</h3>
          {found ? (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Name</label>
                <div>{found.Name || '-'}</div>
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label style={{ fontSize: 13, color: '#3b3b3c', fontWeight: 600 }}>Branch</label>
                <div>{found.Branch || '-'}</div>
              </div>
            </div>
          ) : (
            <div className="helper" style={{ color: '#b91c1c', fontSize: 12 }}>No match for that code.</div>
          )}
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => onNext({ empCode: code || '', employeeName: found?.Name || '', branch: found?.Branch || '' })}
          disabled={!code}
          style={{ appearance: 'none', border: '1px solid rgba(0,0,0,.08)', borderRadius: 999, padding: '12px 20px', fontWeight: 800, background: 'linear-gradient(180deg,#fff,#f7f7f7)', cursor: 'pointer' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 2: Investor ---------- */
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

/* ---------- Step 3: Product (with searchable dropdowns) ---------- */
function StepProduct({ onBack, onNext }) {
  const [product, setProduct] = useState('MF')

  // MF issuer/scheme
  const [mfIssuer, setMfIssuer] = useState('')
  const [mfScheme, setMfScheme] = useState('')
  const mfIssuerOptions = useMemo(() => mfSchemes.map(a => ({ label: a.company, value: a.company })), [])
  const mfSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfIssuer])

  // Non-MF (FD/BOND/NCD/IPO) issuer/scheme
  const nonMfIssuerOptions = useMemo(() => nonMfIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const [fdIssuer, setFdIssuer] = useState('');     const [fdScheme, setFdScheme] = useState('')
  const [bondIssuer, setBondIssuer] = useState(''); const [bondScheme, setBondScheme] = useState('')
  const [ncdIssuer, setNcdIssuer] = useState('');   const [ncdScheme, setNcdScheme] = useState('')
  const [ipoIssuer, setIpoIssuer] = useState('');   const [ipoScheme, setIpoScheme] = useState('')
  const makeNonMfOpts = (issuer) => {
    const f = nonMfIssuers.find(x => x.company === issuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }
  const fdSchemeOptions   = useMemo(() => makeNonMfOpts(fdIssuer),   [fdIssuer])
  const bondSchemeOptions = useMemo(() => makeNonMfOpts(bondIssuer), [bondIssuer])
  const ncdSchemeOptions  = useMemo(() => makeNonMfOpts(ncdIssuer),  [ncdIssuer])
  const ipoSchemeOptions  = useMemo(() => makeNonMfOpts(ipoIssuer),  [ipoIssuer])

  // Insurance issuer -> category -> product
  const [insIssuer, setInsIssuer] = useState('')
  const [insCategory, setInsCategory] = useState('')
  const [insProduct, setInsProduct] = useState('')
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

  // other per-product fields (kept as strings in state; convert on save)
  const [mf, setMF] = useState({
    schemeOption: '', investmentAmount: '', folioPolicyNo: '',
    txnMode: 'Lump Sum', periodicType: '', txnKind: 'Fresh', chequeNo: '', txnRef: ''
  })
  const [fd, setFD] = useState({
    investmentAmount: '', applicationNo: '', clientType: 'Individual',
    depositPeriodYM: '', roi: '', interestPayable: 'Non-Cum', interestFrequency: 'M',
    renewalFdrNo: '', maturityDueDate: '', maturityAmount: ''
  })
  const [ins, setINS] = useState({
    premiumAmount: '', policyNo: '', dateOfIssue: '', renewalDate: '',
    sumAssured: '', premiumTerm: '', renewalPolicyNo: '', renewalAmount: '', renewalDate2: ''
  })
  const [bond, setBond] = useState({ investmentAmount: '', applicationNo: '' })
  const [ncd, setNcd]   = useState({ investmentAmount: '', applicationNo: '' })
  const [ipo, setIpo]   = useState({ investmentAmount: '', applicationNo: '' })

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
  const Section = ({ children }) => <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>{children}</div>
  const toNum = s => (s && String(s).trim() !== '' ? parseFloat(s) : 0)

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Step 3 — Select Product & Fill Details</h3>
      <div className="actions" style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tile('MF', 'Mutual Fund')}
        {tile('FD', 'Fixed Deposit')}
        {tile('INS', 'Insurance')}
        {tile('BOND', 'Bonds')}
        {tile('NCD', 'NCD')}
        {tile('IPO', 'IPO')}
      </div>

      {product === 'MF' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Mutual Fund</h3>
          <Section>
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
              <label>Scheme Option</label>
              <select value={mf.schemeOption} onChange={e=>setMF({...mf, schemeOption:e.target.value})}>
                <option value="">Select</option><option>Growth</option><option>IDCW</option><option>ELSS</option>
              </select>
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={mf.investmentAmount} onChange={e=>setMF({...mf, investmentAmount:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Folio Number (for Addl.)</label>
              <input value={mf.folioPolicyNo} onChange={e=>setMF({...mf, folioPolicyNo:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Transaction Mode</label>
              <select value={mf.txnMode} onChange={e=>setMF({...mf, txnMode:e.target.value})}>
                <option>Lump Sum</option><option>SIP</option><option>STP</option><option>SWP</option><option>Switch Scheme</option>
              </select>
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Fresh / Additional Purchase</label>
              <select value={mf.txnKind} onChange={e=>setMF({...mf, txnKind:e.target.value})}>
                <option>Fresh</option><option>Addl. Purchase</option>
              </select>
            </div>
            {(mf.txnMode==='SIP' || mf.txnMode==='STP' || mf.txnMode==='SWP') && (
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label>Periodic Payment Detail</label>
                <input placeholder="e.g., 12 months / frequency" value={mf.periodicType} onChange={e=>setMF({...mf, periodicType:e.target.value})} />
              </div>
            )}
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Transaction Ref No (Online) / Cheque No</label>
              <input placeholder="RefNo or Cheque No" value={mf.txnRef || mf.chequeNo} onChange={e=>setMF({...mf, txnRef:e.target.value, chequeNo:''})} />
            </div>
          </Section>
        </div>
      )}

      {product === 'FD' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Fixed Deposit</h3>
          <Section>
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
              <input type="number" inputMode="decimal" value={fd.investmentAmount} onChange={e=>setFD({...fd, investmentAmount:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={fd.applicationNo} onChange={e=>setFD({...fd, applicationNo:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Client Category</label>
              <select value={fd.clientType} onChange={e=>setFD({...fd, clientType:e.target.value})}>
                <option>Individual</option><option>Sr. Citizen</option>
              </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Period of Deposit (Y/M)</label>
              <input value={fd.depositPeriodYM} onChange={e=>setFD({...fd, depositPeriodYM:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Interest Rate (%)</label>
              <input type="text" inputMode="decimal" value={fd.roi} onChange={e=>setFD({...fd, roi:e.target.value})} placeholder="e.g., 8.25" />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Interest Payable Type</label>
              <select value={fd.interestPayable} onChange={e=>setFD({...fd, interestPayable:e.target.value})}>
                <option>Non-Cum</option><option>Cum (Comp)</option>
              </select>
            </div>
            {fd.interestPayable==='Non-Cum' && (
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label>Payout Frequency</label>
                <select value={fd.interestFrequency} onChange={e=>setFD({...fd, interestFrequency:e.target.value})}>
                  <option>M</option><option>Q</option><option>H</option><option>Y</option>
                </select>
              </div>
            )}
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Renewal FDR No</label>
              <input value={fd.renewalFdrNo} onChange={e=>setFD({...fd, renewalFdrNo:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Maturity Due Date</label>
              <input type="date" value={fd.maturityDueDate} onChange={e=>setFD({...fd, maturityDueDate:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Maturity Amount</label>
              <input type="text" inputMode="decimal" value={fd.maturityAmount} onChange={e=>setFD({...fd, maturityAmount:e.target.value})} />
            </div>
          </Section>
        </div>
      )}

      {product === 'INS' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Insurance</h3>
          <Section>
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
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Premium Amount</label>
              <input type="number" inputMode="decimal" value={ins.premiumAmount} onChange={e=>setINS({...ins, premiumAmount:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Policy No</label>
              <input value={ins.policyNo} onChange={e=>setINS({...ins, policyNo:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Date of Issue</label>
              <input type="date" value={ins.dateOfIssue} onChange={e=>setINS({...ins, dateOfIssue:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Renewal Date</label>
              <input type="date" value={ins.renewalDate} onChange={e=>setINS({...ins, renewalDate:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Sum Assured</label>
              <input type="text" inputMode="decimal" value={ins.sumAssured} onChange={e=>setINS({...ins, sumAssured:e.target.value})} />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Premium Paying Term</label>
              <input value={ins.premiumTerm} onChange={e=>setINS({...ins, premiumTerm:e.target.value})} />
            </div>
          </Section>
        </div>
      )}

      {product === 'BOND' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Bonds</h3>
          <Section>
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
              <input type="number" inputMode="decimal" value={bond.investmentAmount} onChange={e=>setBond({...bond, investmentAmount:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={bond.applicationNo} onChange={e=>setBond({...bond, applicationNo:e.target.value})} />
            </div>
          </Section>
        </div>
      )}

      {product === 'NCD' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>NCD</h3>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={ncdIssuer}
                onChange={(v)=>{ setNcdIssuer(v); setNcdScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Scheme</label>
              <SearchableSelect
                options={ncdSchemeOptions}
                value={ncdScheme}
                onChange={setNcdScheme}
                placeholder="Select scheme/product"
                disabled={!ncdIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={ncd.investmentAmount} onChange={e=>setNcd({...ncd, investmentAmount:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={ncd.applicationNo} onChange={e=>setNcd({...ncd, applicationNo:e.target.value})} />
            </div>
          </Section>
        </div>
      )}

      {product === 'IPO' && (
        <div className="card" style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, background: '#fff', padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>IPO</h3>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={ipoIssuer}
                onChange={(v)=>{ setIpoIssuer(v); setIpoScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Issuer Scheme</label>
              <SearchableSelect
                options={ipoSchemeOptions}
                value={ipoScheme}
                onChange={setIpoScheme}
                placeholder="Select scheme/product"
                disabled={!ipoIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Investment Amount</label>
              <input type="number" inputMode="decimal" value={ipo.investmentAmount} onChange={e=>setIpo({...ipo, investmentAmount:e.target.value})} />
            </div>
          </Section>
          <Section>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label>Application Number</label>
              <input value={ipo.applicationNo} onChange={e=>setIpo({...ipo, applicationNo:e.target.value})} />
            </div>
          </Section>
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
                issuerCompany: mfIssuer,
                schemeName: mfScheme,
                schemeOption: mf.schemeOption,
                investmentAmount: toNum(mf.investmentAmount),
                folioPolicyNo: mf.folioPolicyNo,
                mode: mf.txnMode,
                sip_stp_swp_period: mf.periodicType,
                txnType: mf.txnKind === 'Addl. Purchase' ? 'Addl. Purchase' : 'Fresh',
                instrumentType: mf.txnRef ? 'Online Ref' : (mf.chequeNo ? 'Cheque' : ''),
                instrumentNo: mf.txnRef || mf.chequeNo || ''
              }
            } else if (product === 'FD') {
              normalized = {
                issuerCompany: fdIssuer,
                schemeName: fdScheme,
                investmentAmount: toNum(fd.investmentAmount),
                folioPolicyNo: fd.applicationNo,
                clientType: fd.clientType,
                depositPeriodYM: fd.depositPeriodYM,
                roi: fd.roi,
                interestPayable: fd.interestPayable,
                interestFrequency: fd.interestFrequency,
                fdr_demat_policy: fd.renewalFdrNo,
                renewalDueDate: fd.maturityDueDate,
                maturityAmount: fd.maturityAmount,
                txnType: 'Fresh',
                mode: 'Lump Sum'
              }
            } else if (product === 'INS') {
              normalized = {
                issuerCompany: insIssuer,
                issuerCategory: insCategory,
                schemeName: insProduct,
                investmentAmount: toNum(ins.premiumAmount),
                folioPolicyNo: ins.policyNo,
                from: ins.dateOfIssue,
                to: ins.renewalDate,
                unitsOrAmount: ins.sumAssured,
                depositPeriodYM: ins.premiumTerm,
                renewalAmount: ins.renewalAmount,
                renewalDueDate: ins.renewalDate2,
                txnType: 'Fresh',
                mode: 'Lump Sum'
              }
            } else if (product === 'BOND') {
              normalized = {
                issuerCompany: bondIssuer,
                schemeName: bondScheme,
                investmentAmount: toNum(bond.investmentAmount),
                folioPolicyNo: bond.applicationNo,
                txnType: 'Fresh',
                mode: 'Lump Sum'
              }
            } else if (product === 'NCD') {
              normalized = {
                issuerCompany: ncdIssuer,
                schemeName: ncdScheme,
                investmentAmount: toNum(ncd.investmentAmount),
                folioPolicyNo: ncd.applicationNo,
                txnType: 'Fresh',
                mode: 'Lump Sum'
              }
            } else if (product === 'IPO') {
              normalized = {
                issuerCompany: ipoIssuer,
                schemeName: ipoScheme,
                investmentAmount: toNum(ipo.investmentAmount),
                folioPolicyNo: ipo.applicationNo,
                txnType: 'Fresh',
                mode: 'Lump Sum'
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

/* ---------- Step 4: Preview & Finish — embedded PDF (stable) ---------- */
function StepFinal({ data, onBack, onSave }) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const receiptRef = useRef(null)
  const prevUrlRef = useRef(null)
  const genTimerRef = useRef(null)
  const lastHashRef = useRef('')

  const stableHash = useMemo(() => {
    try { return JSON.stringify(data || {}) } catch { return '' }
  }, [data])

  const waitForAssets = async (root) => {
    const imgs = Array.from(root.querySelectorAll('img'))
    await Promise.all(imgs.map(img =>
      (img.complete && img.naturalWidth > 0) ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res })
    ))
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready } catch {} }
    await new Promise(r => setTimeout(r, 20))
  }

  const generatePdfBlobUrl = async (node, filename) => {
    await waitForAssets(node)
    const opt = {
      margin: [10,10,10,10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    const worker = window.html2pdf().from(node).set(opt)
    const blob = await worker.outputPdf('blob')
    return URL.createObjectURL(blob)
  }

  const makePdf = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.html2pdf !== 'function') return
    const node = receiptRef.current
    if (!node) return
    setIsBusy(true)
    try {
      const filename = (data?.receiptNo ? `${data.receiptNo}.pdf` : 'receipt.pdf')
      const url = await generatePdfBlobUrl(node, filename)
      const old = prevUrlRef.current
      prevUrlRef.current = url
      setPdfUrl(url)
      if (old) URL.revokeObjectURL(old)
    } catch (e) {
      console.error('PDF gen error', e)
    } finally {
      setIsBusy(false)
    }
  }, [data])

  useEffect(() => {
    if (!data) return
    if (stableHash === lastHashRef.current) return
    lastHashRef.current = stableHash
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    genTimerRef.current = setTimeout(() => { makePdf() }, 150)
    return () => { if (genTimerRef.current) { clearTimeout(genTimerRef.current); genTimerRef.current = null } }
  }, [stableHash, makePdf, data])

  useEffect(() => () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current) }, [])

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Step 4 — Preview & Finish</h3>

      <div className="preview-wrap" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div className="preview-card" style={{ background:'#fff', border:'1px solid rgba(0,0,0,.08)', borderRadius:16, overflow:'hidden', padding:0 }}>
          {pdfUrl ? (
            <iframe key={pdfUrl} title="Receipt PDF" src={pdfUrl} style={{ width:'100%', height:'82vh', border:0, display:'block' }} />
          ) : (
            <div className="container" style={{ borderRadius:16, padding:18 }}>
              {isBusy ? 'Generating PDF…' : 'PDF not available'}
            </div>
          )}
        </div>

        <div className="preview-actions" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button onClick={onBack} style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', background:'rgba(255,255,255,.85)', fontWeight:800 }}>
            Back
          </button>
          <button onClick={makePdf} disabled={isBusy} style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', background:'rgba(255,255,255,.85)', fontWeight:800 }}>
            {isBusy ? 'Regenerating…' : 'Regenerate PDF'}
          </button>
          {pdfUrl && (
            <a href={pdfUrl} download={(data?.receiptNo || 'receipt') + '.pdf'} style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', background:'rgba(255,255,255,.85)', fontWeight:800, textDecoration:'none' }}>
              Download PDF
            </a>
          )}
          <button onClick={onSave} style={{ appearance:'none', border:'1px solid rgba(0,0,0,.08)', borderRadius:999, padding:'12px 20px', fontWeight:800, background:'linear-gradient(180deg,#fff,#f7f7f7)' }}>
            Save to Server
          </button>
        </div>
      </div>

      {/* Hidden HTML source for PDF (A4 width) */}
      <div style={{ position:'absolute', left:-99999, top:-99999 }}>
        <div ref={receiptRef} style={{ width:'794px', padding:'16px' }}>
          <PrintReceipt data={data} />
        </div>
      </div>
    </div>
  )
}

/* ---------- Container ---------- */
export default function MultiStepReceipt() {
  const [step, setStep] = useState(1)
  const [empSeed, setEmpSeed] = useState({ empCode: '', employeeName: '', branch: '' })
  const [investorSeed, setInvestorSeed] = useState({ investorId: '', investorInfo: null })
  const [finalData, setFinalData] = useState(null)

  const buildBase = () => {
    const base = {
      receiptNo: genReceiptNo(),
      date: new Date().toISOString().slice(0, 10),
      branch: empSeed.branch || '',
      employeeName: empSeed.employeeName || '',
      empCode: empSeed.empCode || '',
      investorId: investorSeed.investorId || '',
      investorName: '', investorAddress: '', pinCode: '', pan: '', email: '',
      schemeName: '', schemeOption: '', investmentAmount: '', folioPolicyNo: '',
      mode: 'Lump Sum', sip_stp_swp_period: '', noOfInstallments: '',
      txnType: 'Fresh', txnCategory: [], from: '', to: '', unitsOrAmount: '',
      fdType: '', clientType: 'Individual', depositPeriodYM: '', roi: '',
      interestPayable: 'Non-Cum', interestFrequency: 'M',
      instrumentType: '', instrumentNo: '', instrumentDate: '',
      bankName: '', bankBranch: '', fdr_demat_policy: '', renewalDueDate: '',
      maturityAmount: '', renewalAmount: '', issuerCompany: '', issuerCategory: ''
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
    try {
      const res = await fetch('http://13.60.198.48:8080/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      })
      const out = await res.json()
      if (res.ok) alert('Saved successfully (id=' + out.id + ')')
      else alert('Save failed: ' + JSON.stringify(out))
    } catch (err) {
      alert('Save error: ' + err.message)
    }
  }

  return (
    <div>
      <StepHeader step={step} />

      {step === 1 && (
        <StepEmployee
          value={empSeed.empCode}
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
        <StepFinal data={finalData} onBack={() => setStep(3)} onSave={saveToServer} />
      )}
    </div>
  )
}
