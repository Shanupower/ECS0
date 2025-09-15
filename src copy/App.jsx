// src/App.jsx
import React, { useState } from 'react'
import Login from './components/Login.jsx'
import MultiStepReceipt from './components/MultiStepReceipt.jsx'
import PrintReceipt from './components/PrintReceipt.jsx'
import Logo from './components/Logo.jsx'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [formData, setFormData] = useState(null)

  if (!authed) {
    return (
      <div className="app-wrap">
        <div className="glass login-card">
          <div className="brand" style={{ marginBottom: 12 }}>
            <Logo size={42} />
            <div className="titles">
              <h1 className="title">ECS Financial</h1>
              <div className="subtitle">Internal Receipt Portal</div>
            </div>
          </div>
          <Login onSuccess={() => setAuthed(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrap">
      <div className="glass">
        <div className="header">
          <div className="header-left">
            <div className="brand">
              <Logo size={36} />
              <div className="titles">
                <h1 className="title">ECS Financial — Investor Receipt</h1>
                <div className="subtitle">AMFI Registered Mutual Fund Distributor</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <MultiStepReceipt onPreview={(d) => setFormData(d)} />
        </div>
      </div>

      {formData && (
        <div className="glass" style={{ marginTop: 18 }}>
          <div className="header">
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Preview / Print</h1>
            <div className="actions no-print">
              <button className="btn-ghost" onClick={() => setFormData(null)}>Close</button>
              <button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
          </div>
          <div className="container printable">
            <PrintReceipt data={formData} />
          </div>
        </div>
      )}
    </div>
  )
}
