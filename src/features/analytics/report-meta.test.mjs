import assert from 'node:assert/strict'

import { getReportMeta } from './report-meta.js'

const meta = getReportMeta('fd-maturity')

assert.equal(meta.title, 'Maturity Report')
assert.match(meta.description, /all product maturity/i)
assert.equal(meta.dateBasisOptions[0].label, 'Maturity date')

console.log('[Frontend] report meta tests passed')
