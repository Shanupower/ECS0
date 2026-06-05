import assert from 'node:assert/strict'

import { defaultDateRange, getReportMeta } from './report-meta.js'

const meta = getReportMeta('fd-maturity')

assert.equal(meta.title, 'Maturity Report')
assert.match(meta.description, /all product maturity/i)
assert.equal(meta.dateBasisOptions[0].label, 'Maturity date')

const customerMeta = getReportMeta('customer-detail')
assert.equal(customerMeta.title, 'Customer Detail Report')
assert.equal(customerMeta.filterProfile, 'customerDetail')

const { from, to } = defaultDateRange()
const year = new Date().getFullYear()
assert.equal(from, `${year}-01-01`)
assert.match(to, /^\d{4}-\d{2}-\d{2}$/)

console.log('[Frontend] report meta tests passed')
