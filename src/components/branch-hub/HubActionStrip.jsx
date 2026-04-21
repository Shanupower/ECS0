import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiDownload, FiFileText, FiLayers, FiPlus, FiUsers } from 'react-icons/fi'

export default function HubActionStrip({ branchCode, token, exportRange }) {
  const [exporting, setExporting] = useState(false)
  const tx = branchCode ? `/transactions?branch=${encodeURIComponent(branchCode)}` : '/transactions'

  const downloadReceiptsCsv = async () => {
    if (!token) return
    setExporting(true)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
      const params = new URLSearchParams()
      if (exportRange?.from) params.set('from', exportRange.from)
      if (exportRange?.to) params.set('to', exportRange.to)
      if (branchCode) params.set('branch_code', branchCode)
      const qs = params.toString()
      const url = `${base}/api/export/receipts${qs ? `?${qs}` : ''}`
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', 'receipts-export.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-2.5"
      aria-label="Quick actions"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mr-1">Jump to</span>
      <Link
        to={tx}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
      >
        <FiLayers className="w-3.5 h-3.5" aria-hidden />
        Transactions
        <FiArrowRight className="w-3 h-3 opacity-60" aria-hidden />
      </Link>
      <Link
        to="/leads"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
      >
        <FiFileText className="w-3.5 h-3.5" aria-hidden />
        Leads
        <FiArrowRight className="w-3 h-3 opacity-60" aria-hidden />
      </Link>
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
      >
        <FiUsers className="w-3.5 h-3.5" aria-hidden />
        Customers
        <FiArrowRight className="w-3 h-3 opacity-60" aria-hidden />
      </Link>
      <Link
        to="/receipts"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent-muted)]/80"
      >
        <FiPlus className="w-3.5 h-3.5" aria-hidden />
        Receipts
        <FiArrowRight className="w-3 h-3 opacity-60" aria-hidden />
      </Link>
      {token && (
        <button
          type="button"
          onClick={downloadReceiptsCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50"
          title="Server-generated CSV for the current date range and branch (when set)"
        >
          <FiDownload className="w-3.5 h-3.5" aria-hidden />
          {exporting ? 'Exporting…' : 'Receipts CSV'}
        </button>
      )}
    </nav>
  )
}
