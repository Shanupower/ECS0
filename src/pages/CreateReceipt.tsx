import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import ReportIssueModal from '../components/ReportIssueModal'
import {
  Sidebar,
  TopHeader,
  PageHeader,
  ReceiptStepper,
  EmployeeInfoCard,
  ReceiptPreview,
} from '../components/create-receipt'
import { useReceiptForm } from '../hooks/useReceiptForm'

function CreateReceiptContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const empCode = user?.emp_code ?? 'ECS0000'
  const employeePreview = user
    ? {
        name: user.name || 'G Shanmukh Sitaram',
        branch: user.branch || 'HO',
        email: user.email || 'shanmukh@ecsfinance.com',
      }
    : null

  const {
    step,
    employeeCode,
    employeePreview: formEmployeePreview,
    setEmployeeCode,
    previewData,
    progressSaved,
    setProgressSaved,
    goNextStep,
  } = useReceiptForm(empCode, employeePreview)

  const handleContinue = () => {
    setProgressSaved(true)
    goNextStep()
  }

  const handleNewReceipt = () => {
    window.location.reload()
  }

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
            <PageHeader onNewReceipt={handleNewReceipt} />

            <ReceiptStepper currentStep={step} />

            {step === 1 && (
              <EmployeeInfoCard
                employeeCode={employeeCode}
                employeePreview={formEmployeePreview ?? employeePreview}
                onEmployeeCodeChange={setEmployeeCode}
                onContinue={handleContinue}
                progressSaved={progressSaved}
              />
            )}

            {step > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-6 shadow-[var(--dashboard-shadow-card)]"
              >
                <p className="text-sm text-[var(--dashboard-muted)]">
                  Steps 2–5 (Investor, Product, Details, Review) will use the existing MultiStepReceipt flow. This page shows the new dashboard layout and Step 1 (Employee).
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/receipts')}
                  className="mt-4 text-sm font-medium text-[var(--dashboard-primary)] hover:underline"
                >
                  Use full receipt wizard →
                </button>
              </motion.div>
            )}
          </div>
        </main>

        <div className="hidden lg:block sticky top-0 h-screen pt-14">
          <ReceiptPreview data={previewData} />
        </div>
      </div>
    </>
  )
}

export default function CreateReceiptPage() {
  const { user } = useAuth()
  const [reportIssueOpen, setReportIssueOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[var(--dashboard-bg)] text-[var(--dashboard-text)]">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader
          isAdmin={user?.role === 'admin'}
          userName={user?.name ?? user?.emp_code}
          userEmail={user?.email}
          onReportIssue={() => setReportIssueOpen(true)}
        />

        <CreateReceiptContent />
      </div>

      <ReportIssueModal
        isOpen={reportIssueOpen}
        onClose={() => setReportIssueOpen(false)}
      />
    </div>
  )
}
