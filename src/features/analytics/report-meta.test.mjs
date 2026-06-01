import assert from 'node:assert/strict'

import { getReportMeta } from './report-meta.js'

const meta = getReportMeta('fd-maturity')

assert.equal(meta.title, 'Maturity Report')
assert.match(meta.description, /all product maturity/i)
assert.equal(meta.dateBasisOptions[0].label, 'Maturity date')

const customerMeta = getReportMeta('customer-detail')
assert.equal(customerMeta.title, 'Customer Detail Report')
assert.equal(customerMeta.filterProfile, 'customerDetail')

console.log('[Frontend] report meta tests passed')
