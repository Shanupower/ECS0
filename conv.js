import fs from 'fs'

// Load JSON
const data = JSON.parse(fs.readFileSync('/Users/shanug/Downloads/inv.json', 'utf-8'))

// Pick columns
const headers = ['investorId', 'investorName', 'investorAddress', 'pinCode', 'pan', 'email', 'phone']

const rows = data.map(item =>
  headers.map(h => `"${(item[h] || '').toString().replace(/"/g, '""')}"`).join(',')
)

const csv = [headers.join(','), ...rows].join('\n')

// Save as CSV
fs.writeFileSync('investors.csv', csv)

console.log('✅ Converted investors.json → investors.csv')
