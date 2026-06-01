import assert from 'node:assert/strict'

import {
  buildReportTotalRows,
  formatReportTotalValue,
  sumNumericFields
} from './report-totals.js'

const rows = [
  { applications: 2, amount: 1000, collection_credit: 25, incentive_amount: 10, label: 'A' },
  { applications: '3', amount: '2500.5', collection_credit: null, incentive_amount: null, label: 'B' },
  { applications: 1, amount: 'not-a-number', collection_credit: 5, incentive_amount: 2, label: 'C' }
]

assert.deepEqual(sumNumericFields(rows, ['applications', 'amount', 'collection_credit', 'incentive_amount']), {
  applications: 6,
  amount: 3500.5,
  collection_credit: 30,
  incentive_amount: 12
})

assert.deepEqual(sumNumericFields([{ incentive_amount: null }], ['incentive_amount']), {
  incentive_amount: null
})

assert.deepEqual(
  buildReportTotalRows({
    rows,
    fields: ['applications', 'amount'],
    filteredTotals: { applications: 100, amount: 99999 }
  }),
  [
    { label: 'Page total', values: { applications: 6, amount: 3500.5 } },
    { label: 'Filtered total', values: { applications: 100, amount: 99999 } }
  ]
)

assert.deepEqual(
  buildReportTotalRows({
    rows,
    fields: ['applications', 'amount']
  }),
  [{ label: 'Total', values: { applications: 6, amount: 3500.5 } }]
)

assert.equal(formatReportTotalValue('applications', 6), '6')
assert.equal(formatReportTotalValue('amount', 3500.5), '3,501')
assert.equal(formatReportTotalValue('incentive_amount', null), '—')

console.log('[Frontend] report totals helper tests passed')
