import { useState, useMemo, useCallback } from 'react'
import type { EmployeePreview, ReceiptPreviewData } from '../components/create-receipt'

const STEP_COUNT = 5

export interface ReceiptFormState {
  step: number
  employeeCode: string
  employeePreview: EmployeePreview | null
  previewData: ReceiptPreviewData
  progressSaved: boolean
}

const defaultPreviewData: ReceiptPreviewData = {
  receiptNumber: '0000000',
  employee: undefined,
  investor: undefined,
  product: undefined,
  issuer: undefined,
  scheme: undefined,
  amount: undefined,
  total: 0,
}

export function useReceiptForm(initialEmployeeCode: string, initialEmployeePreview: EmployeePreview | null) {
  const [step, setStep] = useState(1)
  const [employeeCode, setEmployeeCode] = useState(initialEmployeeCode)
  const [employeePreview, setEmployeePreview] = useState<EmployeePreview | null>(initialEmployeePreview)
  const [progressSaved, setProgressSaved] = useState(false)

  const previewData: ReceiptPreviewData = useMemo(() => ({
    ...defaultPreviewData,
    receiptNumber: `ECS-${String(Date.now()).slice(-7)}`,
    employee: employeePreview?.name ?? undefined,
    investor: undefined,
    product: undefined,
    issuer: undefined,
    scheme: undefined,
    amount: undefined,
    total: 0,
  }), [employeePreview])

  const goNextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_COUNT))
  }, [])

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(s, STEP_COUNT)))
  }, [])

  const setProgressSavedFlag = useCallback((saved: boolean) => {
    setProgressSaved(saved)
  }, [])

  return {
    step,
    employeeCode,
    employeePreview,
    setEmployeeCode,
    setEmployeePreview,
    previewData,
    progressSaved,
    setProgressSaved: setProgressSavedFlag,
    goNextStep,
    goToStep,
    stepCount: STEP_COUNT,
  }
}
