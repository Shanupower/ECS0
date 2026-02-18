import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MultiStepReceipt from '../components/MultiStepReceipt.jsx'
import { FiFileText } from 'react-icons/fi'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

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
    <div className="space-y-6">
      <div className="flex items-center">
        <FiFileText className="w-6 h-6 text-red-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Receipt</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate a new financial receipt</p>
        </div>
      </div>
      {!draftId && cachedDraftId && (
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
          <span>We found a failed receipt draft. Resume where you left off?</span>
          <button
            className="px-3 py-1.5 rounded-md bg-yellow-600 text-white text-sm font-semibold"
            onClick={() => navigate(`/receipts?draftId=${cachedDraftId}`)}
          >
            Resume
          </button>
        </div>
      )}
      {!draftId && !cachedDraftId && localDraftPayload && (
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
          <span>We found a locally saved draft. Save it to the server and resume?</span>
          <button
            className="px-3 py-1.5 rounded-md bg-yellow-600 text-white text-sm font-semibold disabled:opacity-50"
            onClick={handleResumeLocalDraft}
            disabled={savingLocalDraft}
          >
            {savingLocalDraft ? 'Saving...' : 'Save & Resume'}
          </button>
        </div>
      )}
      {localDraftError && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {localDraftError}
        </div>
      )}
      {draftError && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {draftError}
        </div>
      )}
      {draftLoading ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading draft...</div>
      ) : (
        <MultiStepReceipt draftData={draftData} draftId={draftId} />
      )}
    </div>
  )
}
