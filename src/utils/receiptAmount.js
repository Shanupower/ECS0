/**
 * Category-aware effective investment amount for display and edit prefill.
 * FD/GOVT_FD: prefer FD deposit fields so MF transaction.amount does not override deposit.
 */
function asFiniteNumber(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function effectiveInvestmentAmountForReceipt(receipt) {
  if (!receipt) return null
  const cat = String(receipt.product_category || '').toUpperCase()
  const nestedFd = receipt.product_details?.fd?.deposit?.amount

  if (cat === 'FD' || cat === 'GOVT_FD') {
    return (
      asFiniteNumber(receipt.fd_deposit_amount) ??
      asFiniteNumber(nestedFd) ??
      asFiniteNumber(receipt.investment_amount) ??
      asFiniteNumber(receipt.investmentAmount)
    )
  }

  return (
    asFiniteNumber(receipt.investment_amount) ??
    asFiniteNumber(receipt.investmentAmount) ??
    asFiniteNumber(receipt.fd_deposit_amount) ??
    asFiniteNumber(nestedFd)
  )
}
