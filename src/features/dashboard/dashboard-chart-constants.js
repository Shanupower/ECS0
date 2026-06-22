export const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0d9488', '#e11d48', '#0284c7', '#65a30d', '#ca8a04', '#db2777']

export const DONUT_COLORS = [
  '#2563eb', '#ea580c', '#7c3aed', '#16a34a', '#dc2626', '#0891b2',
  '#ca8a04', '#c026d3', '#4f46e5', '#65a30d', '#db2777', '#0f766e'
]

export const CATEGORY_LABELS = {
  MF: 'MF',
  FD: 'FD',
  BOND: 'Bonds',
  INS: 'Insurance',
  NCD: 'NCD',
  GOVT_FD: 'Government Schemes',
  MISC: 'Misc'
}

export function getCategoryLabel(c) {
  return (c && CATEGORY_LABELS[c]) || (c || 'Other')
}
