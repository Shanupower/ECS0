import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, FileText, Loader2 } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'

const DEBOUNCE_MS = 280
const MIN_QUERY_LENGTH = 2

export function GlobalSearch({ onClose, className, inputRef: externalInputRef }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [receipts, setReceipts] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const internalRef = useRef(null)
  const inputRef = externalInputRef ?? internalRef

  const totalResults = customers.length + receipts.length
  const hasResults = query.trim().length >= MIN_QUERY_LENGTH && (customers.length > 0 || receipts.length > 0)
  const showEmpty = query.trim().length >= MIN_QUERY_LENGTH && !loading && totalResults === 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LENGTH) {
      setCustomers([])
      setReceipts([])
      setSelectedIndex(0)
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const [custRes, recRes] = await Promise.all([
          api.searchCustomers(token, { q, limit: '8', page: '1' }),
          api.listReceipts(token, { search: q, page: 1, size: 8 }),
        ])
        const custList = custRes?.customers ?? custRes?.items ?? (Array.isArray(custRes) ? custRes : [])
        const recList = recRes?.items ?? (Array.isArray(recRes) ? recRes : [])
        setCustomers(custList.slice(0, 8))
        setReceipts(recList.slice(0, 8))
        setSelectedIndex(0)
      } catch (err) {
        setCustomers([])
        setReceipts([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, token])

  useEffect(() => {
    setSelectedIndex((i) => Math.min(Math.max(0, i), Math.max(0, totalResults - 1)))
  }, [totalResults])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('')
      onClose?.()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, totalResults - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && totalResults > 0) {
      e.preventDefault()
      if (selectedIndex < customers.length) {
        navigate('/customers')
        setQuery('')
        onClose?.()
        return
      }
      const r = receipts[selectedIndex - customers.length]
      if (r?.id != null) navigate(`/receipts/${r.id}`)
      else navigate(`/transactions`)
      setQuery('')
      onClose?.()
    }
  }

  const handleSelectCustomer = (c) => {
    navigate('/customers')
    onClose?.()
  }

  const handleSelectReceipt = (r) => {
    if (r?.id) navigate(`/receipts/${r.id}`)
    onClose?.()
  }

  let flatIndex = 0
  return (
    <div className={cn('relative flex-1 min-w-0 max-w-md', className)}>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-bg)] dark:bg-[var(--dashboard-bg)] transition-colors focus-within:border-[var(--dashboard-primary)] focus-within:ring-2 focus-within:ring-[var(--dashboard-primary)]/20">
        <Search className="w-4 h-4 text-[var(--dashboard-muted)] flex-shrink-0 ml-3" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search customers, receipts… (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 py-2.5 pr-4 pl-1 text-sm bg-transparent text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] outline-none"
          aria-label="Search"
        />
        {loading && <Loader2 className="w-4 h-4 text-[var(--dashboard-muted)] animate-spin flex-shrink-0 mr-2" />}
      </div>
      {query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[100] flex flex-col bg-[var(--dashboard-card)] border border-[var(--dashboard-border)] rounded-xl shadow-lg overflow-hidden min-w-[280px]">
          <div className="max-h-[min(60vh,320px)] overflow-y-auto">
            {showEmpty && (
              <div className="px-4 py-6 text-center text-sm text-[var(--dashboard-muted)]">
                No customers or receipts found for &quot;{query.trim()}&quot;
              </div>
            )}
            {hasResults && (
              <>
                {customers.length > 0 && (
                  <div className="px-2 py-1.5">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">Customers</p>
                    {customers.map((c) => {
                      const isSelected = selectedIndex === flatIndex
                      const i = flatIndex++
                      return (
                        <button
                          key={c.investor_id || c.id || i}
                          type="button"
                          onClick={() => { handleSelectCustomer(c); setQuery(''); onClose?.(); }}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                            isSelected ? 'bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]' : 'text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50'
                          )}
                        >
                          <Users className="w-4 h-4 flex-shrink-0 text-[var(--dashboard-muted)]" />
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{c.name || c.investor_name || '—'}</span>
                            {c.investor_id != null && <span className="ml-2 text-[var(--dashboard-muted)]">#{c.investor_id}</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                {receipts.length > 0 && (
                  <div className="px-2 py-1.5 border-t border-[var(--dashboard-border)]">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">Receipts</p>
                    {receipts.map((r) => {
                      const isSelected = selectedIndex === flatIndex
                      const i = flatIndex++
                      return (
                        <button
                          key={r.id || r.receipt_no || i}
                          type="button"
                          onClick={() => { handleSelectReceipt(r); setQuery(''); onClose?.(); }}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                            isSelected ? 'bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]' : 'text-[var(--dashboard-text)] hover:bg-[var(--dashboard-border)]/50'
                          )}
                        >
                          <FileText className="w-4 h-4 flex-shrink-0 text-[var(--dashboard-muted)]" />
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{r.receipt_no || `#${r.id}`}</span>
                            {r.investor_name && <span className="ml-2 text-[var(--dashboard-muted)] truncate">{r.investor_name}</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="px-3 py-2 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-bg)] text-[10px] text-[var(--dashboard-muted)]">
            ↑↓ navigate · Enter open · Esc close
          </div>
        </div>
      )}
    </div>
  )
}
