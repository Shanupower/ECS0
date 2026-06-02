import assert from 'node:assert/strict'

import {
  buildBranchOptions,
  buildInvestorOptions,
  buildRmOptions,
  filterBranchOptions,
  filterInvestorOptions,
  filterRmOptions,
  filtersToReportQuery,
  formatBranchOptionLabel,
  formatInvestorOptionLabel,
  formatRmOptionLabel,
  toggleListValue,
  canRunCustomerDetailReport,
  filtersToCustomerListQuery
} from './report-filters.js'

const users = [
  { emp_code: 'ECS001', name: 'Anita Rao', email: 'anita@example.com', role: 'rm' },
  { emp_code: 'ECS002', name: 'Bhaskar Menon', email: 'bhaskar@example.com', role: 'manager' },
  { emp_code: '', name: 'No Code' }
]

const options = buildRmOptions(users)

assert.deepEqual(
  options.map((o) => o.value),
  ['ECS001', 'ECS002']
)
assert.equal(formatRmOptionLabel(options[0]), 'Anita Rao (ECS001)')
assert.equal(filterRmOptions(options, 'bhaskar')[0].value, 'ECS002')
assert.equal(filterRmOptions(options, 'ecs001')[0].label, 'Anita Rao')
assert.equal(filterRmOptions(options, 'example.com').length, 2)
assert.equal(filterRmOptions(options, 'missing').length, 0)

const branches = [
  { branch_code: 'BR001', branch_name: 'Mumbai Central', branch_type: 'Operational' },
  { branch_code: 'BR002', branch_name: 'Hyderabad RO', branch: 'HYD' },
  { branch_code: '', branch_name: 'No Code' }
]

const branchOptions = buildBranchOptions(branches)

assert.deepEqual(
  branchOptions.map((o) => o.value),
  ['BR002', 'BR001']
)
assert.equal(formatBranchOptionLabel(branchOptions[1]), 'Mumbai Central (BR001)')
assert.equal(filterBranchOptions(branchOptions, 'hyderabad')[0].value, 'BR002')
assert.equal(filterBranchOptions(branchOptions, 'br001')[0].label, 'Mumbai Central')
assert.equal(filterBranchOptions(branchOptions, 'operational').length, 1)
assert.equal(filterBranchOptions(branchOptions, 'missing').length, 0)

const investorSearchResponse = {
  customers: [
    { investor_id: 101, name: 'Ravi Shah', pan: 'ABCDE1234F', mobile: '9999999999' },
    { investor_id: 102, name: 'Meera Patel', pan: 'PQRSX9876L' }
  ],
  minors: [
    { investor_id: 201, name: 'Aarav Shah', pan: 'MINOR1234A', is_minor: true, parent_name: 'Ravi Shah' }
  ]
}

const investorOptions = buildInvestorOptions(investorSearchResponse)

assert.deepEqual(
  investorOptions.map((o) => o.value),
  ['101', '102', '201']
)
assert.equal(formatInvestorOptionLabel(investorOptions[0]), 'Ravi Shah (101)')
assert.equal(filterInvestorOptions(investorOptions, 'abcde')[0].value, '101')
assert.equal(filterInvestorOptions(investorOptions, 'aarav')[0].parentName, 'Ravi Shah')
assert.equal(filterInvestorOptions(investorOptions, '999999').length, 1)
assert.equal(filterInvestorOptions(investorOptions, 'missing').length, 0)

const multiQuery = filtersToReportQuery({
  branchCodes: ['BR001', 'BR002'],
  empCodes: ['ECS001'],
  productCategories: ['MF', 'FD'],
  schemeCategories: ['Equity'],
  issuerNames: ['HDFC', 'ICICI'],
  schemeNames: ['Growth Plan'],
  investorIds: ['101', '102'],
  hideCc: true,
  hideSi: true,
  includePending: true
})

assert.equal(multiQuery.branch_codes, 'BR001,BR002')
assert.equal(multiQuery.emp_codes, 'ECS001')
assert.equal(multiQuery.product_categories, 'MF,FD')
assert.equal(multiQuery.scheme_categories, 'Equity')
assert.equal(multiQuery.issuer_names, 'HDFC,ICICI')
assert.equal(multiQuery.scheme_names, 'Growth Plan')
assert.equal(multiQuery.investor_ids, '101,102')
assert.equal(multiQuery.search, undefined)
assert.equal(multiQuery.hide_cc, '1')
assert.equal(multiQuery.hide_si, '1')

const legacySearchQuery = filtersToReportQuery({ search: 'Ravi' })
assert.equal(legacySearchQuery.search, 'Ravi')
assert.equal(legacySearchQuery.investor_ids, undefined)

assert.deepEqual(toggleListValue(['a'], 'b'), ['a', 'b'])
assert.deepEqual(toggleListValue(['a', 'b'], 'a'), ['b'])

assert.equal(canRunCustomerDetailReport({ investorIds: ['1'] }), true)
assert.equal(canRunCustomerDetailReport({ branchCodes: ['HO'] }), true)
assert.equal(canRunCustomerDetailReport({ productCategories: ['MF'] }), true)
assert.equal(canRunCustomerDetailReport({}), false)

const listQ = filtersToCustomerListQuery(
  { from: '2024-01-01', branchCodes: ['HO'], customerSearch: 'Ravi', customerSort: 'pin:desc' },
  { customerPage: 2, customerPageSize: 50 }
)
assert.equal(listQ.customer_page, '2')
assert.equal(listQ.customer_page_size, '50')
assert.equal(listQ.customer_search, 'Ravi')
assert.equal(listQ.branch_codes, 'HO')
assert.equal(listQ.customer_sort, 'pin:desc')

console.log('[Frontend] report filter helper tests passed')
