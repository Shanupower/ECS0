import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MultiStepReceipt from '../components/MultiStepReceipt.jsx'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'

export default function ReceiptsPage(){
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [draftData, setDraftData] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [localDraftPayload, setLocalDraftPayload] = useState(null)
  const [localDraftError, setLocalDraftError] = useState('')
  const [savingLocalDraft, setSavingLocalDraft] = useState(false)

  const draftId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('draftId')
  }, [location.search])

  const cachedDraftId = useMemo(() => {
    return localStorage.getItem('failed_receipt_draft_id')
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('failed_receipt_draft_local')
      if (raw) {
        const parsed = JSON.parse(raw)
        setLocalDraftPayload(parsed?.draft_payload || null)
      } else {
        setLocalDraftPayload(null)
      }
    } catch (err) {
      console.error('Failed to parse local draft:', err)
      setLocalDraftPayload(null)
    }
  }, [])

  useEffect(() => {
    const loadDraft = async () => {
      if (!token || !draftId) return
      setDraftLoading(true)
      setDraftError('')
      try {
        const draft = await api.getReceiptDraft(token, draftId)
        setDraftData(draft?.draft_data || null)
      } catch (err) {
        setDraftError(err.message || 'Failed to load receipt draft')
        setDraftData(null)
      } finally {
        setDraftLoading(false)
      }
    }
    loadDraft()
  }, [token, draftId])

  const handleResumeLocalDraft = async () => {
    if (!token || !localDraftPayload) return
    setSavingLocalDraft(true)
    setLocalDraftError('')
    try {
      const result = await api.createReceiptDraft(token, localDraftPayload)
      const newDraftId = result?.draft_id || result?.id
      if (newDraftId) {
        localStorage.setItem('failed_receipt_draft_id', newDraftId)
        localStorage.removeItem('failed_receipt_draft_local')
        navigate(`/receipts?draftId=${newDraftId}`)
      } else {
        setLocalDraftError('Failed to create server draft')
      }
    } catch (err) {
      setLocalDraftError(err.message || 'Failed to save draft to server')
    } finally {
      setSavingLocalDraft(false)
    }
  }

  useEffect(() => {
    if (!token || !localDraftPayload || savingLocalDraft) return

    const tryAutoSave = async () => {
      try {
        const result = await api.createReceiptDraft(token, localDraftPayload)
        const newDraftId = result?.draft_id || result?.id
        if (newDraftId) {
          localStorage.setItem('failed_receipt_draft_id', newDraftId)
          localStorage.removeItem('failed_receipt_draft_local')
          setLocalDraftPayload(null)
        }
      } catch (err) {
        console.warn('Auto-save draft failed:', err)
      }
    }

    const onOnline = () => {
      tryAutoSave()
    }

    window.addEventListener('online', onOnline)
    if (navigator.onLine) {
      tryAutoSave()
    }

    return () => window.removeEventListener('online', onOnline)
  }, [token, localDraftPayload, savingLocalDraft])

  return (
    <div className="space-y-4 -ml-4 lg:-ml-6">
      {!draftId && cachedDraftId && (
        <div className="rounded-card border border-[var(--warn)]/40 bg-[var(--warn-muted)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-body text-[var(--text-primary)]">We found a failed receipt draft. Resume where you left off?</span>
          <Button variant="primary" onClick={() => navigate(`/receipts?draftId=${cachedDraftId}`)}>Resume</Button>
        </div>
      )}
      {!draftId && !cachedDraftId && localDraftPayload && (
        <div className="rounded-card border border-[var(--warn)]/40 bg-[var(--warn-muted)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-body text-[var(--text-primary)]">We found a locally saved draft. Save it to the server and resume?</span>
          <Button variant="primary" onClick={handleResumeLocalDraft} disabled={savingLocalDraft}>
            {savingLocalDraft ? 'Saving…' : 'Save & resume'}
          </Button>
        </div>
      )}
      {localDraftError && (
        <div className="rounded-card border border-[var(--error)]/40 bg-[var(--error-muted)] px-4 py-3 text-body text-[var(--error)]">
          {localDraftError}
        </div>
      )}
      {draftError && (
        <div className="rounded-card border border-[var(--error)]/40 bg-[var(--error-muted)] px-4 py-3 text-body text-[var(--error)]">
          {draftError}
        </div>
      )}
      {draftLoading ? (
        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-body text-[var(--text-muted)]">Loading draft…</p>
        </div>
      ) : (
        <MultiStepReceipt draftData={draftData} draftId={draftId} />
      )}
    </div>
  )
}
