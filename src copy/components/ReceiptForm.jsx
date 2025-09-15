import React, { useEffect, useState } from 'react'

export default function ReceiptForm({
  onPreview,
  initialData = {},
  branchesData,
  lockBranch = false,
  lockEmployee = false,
  lockInvestor = false
}) {
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    receiptNo:'', date:'', branch:'',
    employeeName:'', empCode:'',
    investorId:'', investorName:'', investorAddress:'', pinCode:'', pan:'', email:'',
    schemeName:'', schemeOption:'', investmentAmount:'', folioPolicyNo:'',
    mode:'Lump Sum', sip_stp_swp_period:'', noOfInstallments:'',
    txnType:'Fresh', txnCategory:[], from:'', to:'', unitsOrAmount:'',
    fdType:'', clientType:'Individual', depositPeriodYM:'', roi:'',
    interestPayable:'Non-Cum', interestFrequency:'M',
    instrumentType:'Cheque/DD/ASBA/PO/UTR', instrumentNo:'', instrumentDate:'',
    bankName:'', bankBranch:'', fdr_demat_policy:'', renewalDueDate:'',
    maturityAmount:'', renewalAmount:''
  })

  useEffect(() => { setData(d => ({ ...d, ...initialData })) }, [initialData])

  const set = (k,v)=> setData(d=>({ ...d, [k]: v }))
  const toggleSet = (field, value) => {
    setData(d => {
      const s = new Set(d[field] || [])
      s.has(value) ? s.delete(value) : s.add(value)
      return { ...d, [field]: Array.from(s) }
    })
  }

  const submitPreview = (e) => { e.preventDefault(); onPreview?.(data) }

  const submitSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('http://13.60.198.48:8080/api/receipts', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(data)
      })
      const out = await res.json()
      if(res.ok) alert('Saved successfully (id='+out.id+')')
      else alert('Save failed: '+JSON.stringify(out))
    } catch(err){ alert('Save error: '+err.message) }
    finally{ setSaving(false) }
  }

  const investmentTypes = ['MF (OG/NFO)','FD','Insurance','Bond','NCD','IPO','NPS','Demat','Post Office']
  const schemeOptions = ['Growth','IDCW','ELSS']

  const ReadonlyChip = ({children}) => (
    <div style={{padding:'10px 12px', border:'1px solid var(--border)', borderRadius:12, background:'rgba(255,255,255,.85)'}}>
      {children || <span className="helper">—</span>}
    </div>
  )

  return (
    <form onSubmit={submitPreview}>
      <div className="row">
        <div className="col">
          <label>Receipt No</label>
          <input value={data.receiptNo} onChange={e=>set('receiptNo', e.target.value)} required />
        </div>
        <div className="col">
          <label>Date</label>
          <input type="date" value={data.date} onChange={e=>set('date', e.target.value)} required />
        </div>
        <div className="col">
          <label>Branch</label>
          {lockBranch ? (
            <ReadonlyChip>{data.branch}</ReadonlyChip>
          ) : Array.isArray(branchesData) && branchesData.length ? (
            <>
              <input list="branch-list" value={data.branch} onChange={e=>set('branch', e.target.value)} placeholder="Type or select branch" />
              <datalist id="branch-list">
                {branchesData.map((b,i)=>(<option key={i} value={b.branch}>{b.address||''}</option>))}
              </datalist>
            </>
          ) : (
            <input value={data.branch} onChange={e=>set('branch', e.target.value)} />
          )}
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label>Employee Name</label>
          {lockEmployee ? (
            <ReadonlyChip>{data.employeeName}</ReadonlyChip>
          ) : (
            <input value={data.employeeName} onChange={e=>set('employeeName', e.target.value)} />
          )}
        </div>
        <div className="col">
          <label>Emp Code</label>
          {lockEmployee ? (
            <ReadonlyChip>{data.empCode}</ReadonlyChip>
          ) : (
            <input value={data.empCode} onChange={e=>set('empCode', e.target.value)} />
          )}
        </div>
      </div>

      <hr className="div" />

      <div className="row">
        <div className="col">
          <label>Investment Type</label>
          <div className="checkbox-grid">
            {investmentTypes.map(t => (
              <label key={t} style={{display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" checked={data.txnCategory.includes(t)} onChange={()=>toggleSet('txnCategory', t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="col">
          <label>Investor ID</label>
          {lockInvestor ? (
            <ReadonlyChip>{data.investorId}</ReadonlyChip>
          ) : (
            <input value={data.investorId} onChange={e=>set('investorId', e.target.value)} />
          )}

          <label style={{marginTop:10}}>Investor Name & Address</label>
          <textarea
            value={(data.investorName || '') + (data.investorAddress ? ('\n'+data.investorAddress) : '')}
            onChange={e=>{
              const [name, ...rest] = e.target.value.split('\n')
              set('investorName', name)
              set('investorAddress', rest.join('\n'))
            }}
            placeholder="Name\nAddress lines"
          />
          <div className="row">
            <div className="col">
              <label>Pin Code</label>
              <input value={data.pinCode} onChange={e=>set('pinCode', e.target.value)} />
            </div>
            <div className="col">
              <label>PAN No</label>
              <input value={data.pan} onChange={e=>set('pan', e.target.value)} />
            </div>
          </div>
          <label style={{marginTop:10}}>E-mail</label>
          <input type="email" value={data.email} onChange={e=>set('email', e.target.value)} />
        </div>
      </div>

      <hr className="div" />

      <div className="row">
        <div className="col">
          <label>SCHEME NAME / ISSUER NAME</label>
          <input value={data.schemeName} onChange={e=>set('schemeName', e.target.value)} />
        </div>
        <div className="col">
          <label>Scheme Option</label>
          <div className="row">
            {schemeOptions.map(o => (
              <label key={o} style={{display:'flex',alignItems:'center', gap:8}}>
                <input type="radio" name="schemeOption" checked={data.schemeOption===o} onChange={()=>set('schemeOption', o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col">
          <label>Investment Amount</label>
          <input type="number" value={data.investmentAmount} onChange={e=>set('investmentAmount', e.target.value)} />
          <label style={{marginTop:10}}>Appln / Folio / Policy No</label>
          <input value={data.folioPolicyNo} onChange={e=>set('folioPolicyNo', e.target.value)} />
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label>Mode</label>
          <select value={data.mode} onChange={e=>set('mode', e.target.value)}>
            <option>Lump Sum</option>
            <option>SIP</option>
            <option>STP</option>
            <option>SWP</option>
          </select>
        </div>
        <div className="col">
          <label>Period / No. of Installments</label>
          <input value={data.sip_stp_swp_period} onChange={e=>set('sip_stp_swp_period', e.target.value)} placeholder="e.g., 12 months" />
        </div>
        <div className="col">
          <label>No. of Installments</label>
          <input value={data.noOfInstallments} onChange={e=>set('noOfInstallments', e.target.value)} />
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label>Transaction</label>
          <div className="row">
            {['Fresh','Addl. Purchase','Renewal'].map(t => (
              <label key={t} style={{display:'flex',alignItems:'center', gap:8}}>
                <input type="radio" name="txnType" checked={data.txnType===t} onChange={()=>set('txnType', t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col">
          <label>From</label>
          <input value={data.from} onChange={e=>set('from', e.target.value)} />
          <label style={{marginTop:10}}>To</label>
          <input value={data.to} onChange={e=>set('to', e.target.value)} />
        </div>
        <div className="col">
          <label>No. of units / Amount</label>
          <input value={data.unitsOrAmount} onChange={e=>set('unitsOrAmount', e.target.value)} />
        </div>
      </div>

      <hr className="div" />

      <div className="row">
        <div className="col">
          <label>FD/Bonds/NCD</label>
          <input value={data.fdType} onChange={e=>set('fdType', e.target.value)} placeholder="optional" />
        </div>
        <div className="col">
          <label>Client Type</label>
          <div className="row">
            {['Individual','Sr. Citizen'].map(o => (
              <label key={o} style={{display:'flex',alignItems:'center', gap:8}}>
                <input type="radio" name="clientType" checked={data.clientType===o} onChange={()=>set('clientType', o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col">
          <label>Period of Deposit (Y/M) & ROI (%)</label>
          <input value={data.depositPeriodYM} onChange={e=>set('depositPeriodYM', e.target.value)} placeholder="e.g., 1Y 6M" />
          <input style={{marginTop:8}} value={data.roi} onChange={e=>set('roi', e.target.value)} placeholder="ROI %" />
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label>Interest Payable</label>
          <div className="row">
            {['Non-Cum','Cum (Comp)'].map(o => (
              <label key={o} style={{display:'flex',alignItems:'center', gap:8}}>
                <input type="radio" name="interestPayable" checked={data.interestPayable===o} onChange={()=>set('interestPayable', o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col">
          <label>Frequency</label>
          <select value={data.interestFrequency} onChange={e=>set('interestFrequency', e.target.value)}>
            {['M','Q','H','Y'].map(f=> <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <hr className="div" />

      <div className="row">
        <div className="col">
          <label>Instrument Type</label>
          <input value={data.instrumentType} onChange={e=>set('instrumentType', e.target.value)} />
          <label style={{marginTop:10}}>Instrument No</label>
          <input value={data.instrumentNo} onChange={e=>set('instrumentNo', e.target.value)} />
          <label style={{marginTop:10}}>Date</label>
          <input type="date" value={data.instrumentDate} onChange={e=>set('instrumentDate', e.target.value)} />
        </div>
        <div className="col">
          <label>Bank Name</label>
          <input value={data.bankName} onChange={e=>set('bankName', e.target.value)} />
          <label style={{marginTop:10}}>Branch</label>
          <input value={data.bankBranch} onChange={e=>set('bankBranch', e.target.value)} />
        </div>
        <div className="col">
          <label>FDR No / Demat a/c / Policy No</label>
          <input value={data.fdr_demat_policy} onChange={e=>set('fdr_demat_policy', e.target.value)} />
          <label style={{marginTop:10}}>Renewal / Maturity Due Date</label>
          <input type="date" value={data.renewalDueDate} onChange={e=>set('renewalDueDate', e.target.value)} />
          <label style={{marginTop:10}}>Maturity Amount</label>
          <input value={data.maturityAmount} onChange={e=>set('maturityAmount', e.target.value)} />
          <label style={{marginTop:10}}>Renewal Amount</label>
          <input value={data.renewalAmount} onChange={e=>set('renewalAmount', e.target.value)} />
        </div>
      </div>

      <div className="actions" style={{marginTop:16}}>
        <button type="submit" className="btn-primary">Preview</button>
        <button type="button" className="btn-ghost" onClick={submitSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
