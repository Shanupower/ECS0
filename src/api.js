const BASE = import.meta.env.VITE_API_BASE_URL || 'http://13.201.70.120:8080'

function authHeaders(token){ return token ? { Authorization: `Bearer ${token}` } : {} }

async function req(path,{method='GET',token,json,query}={}){
  const qs = query ? '?' + new URLSearchParams(query).toString() : ''
  const res = await fetch(BASE+path+qs,{
    method,
    headers:{
      ...(json?{'Content-Type':'application/json'}:{}),
      ...authHeaders(token)
    },
    body: json?JSON.stringify(json):undefined
  })
  const ct=res.headers.get('content-type')||''
  const data= ct.includes('application/json')?await res.json():await res.text()
  if(!res.ok) throw new Error(data.error||data.message||res.statusText)
  return data
}

export const api={
  // Auth endpoints
  login:(c,p)=>req('/api/auth/login',{method:'POST',json:{emp_code:c,password:p}}),
  register:(data)=>req('/api/auth/register',{method:'POST',json:data}),
  
  // User endpoints
  me:(t)=>req('/api/users/me',{token:t}),
  listUsers:(t)=>req('/api/users',{token:t}),
  createUser:(t,data)=>req('/api/users',{method:'POST',token:t,json:data}),
  updateUser:(t,id,data)=>req(`/api/users/${id}`,{method:'PATCH',token:t,json:data}),
  changePassword:(t,id,password)=>req(`/api/users/${id}/password`,{method:'PATCH',token:t,json:{password}}),
  deleteUser:(t,id)=>req(`/api/users/${id}`,{method:'DELETE',token:t}),
  
  // Receipt endpoints
  listReceipts:(t,q)=>req('/api/receipts',{token:t,query:q}),
  getReceipt:(t,id)=>req(`/api/receipts/${id}`,{token:t}),
  getReceiptsByEmpCode:(t,empCode,q)=>req(`/api/receipts/emp/${empCode}`,{token:t,query:q}),
  createReceipt:(t,p)=>req('/api/receipts',{method:'POST',token:t,json:p}),
  updateReceipt:(t,id,data)=>req(`/api/receipts/${id}`,{method:'PATCH',token:t,json:data}),
  deleteReceipt:(t,id,r)=>req(`/api/receipts/${id}`,{method:'DELETE',token:t,json:{reason:r}}),
  restoreReceipt:(t,id)=>req(`/api/receipts/${id}/restore`,{method:'POST',token:t}),
  updateReceiptStatus:(t,id,status)=>req(`/api/receipts/${id}/status`,{method:'PATCH',token:t,json:{status}}),
  
  // Customer/Investor endpoints
  createCustomer:(t,customerData)=>req('/api/customers',{method:'POST',token:t,json:customerData}),
  
  // Stats endpoints
  statsSummary:(t,q)=>req('/api/stats/summary',{token:t,query:q}),
  statsByCategory:(t,q)=>req('/api/stats/by-category',{token:t,query:q}),
  statsByDay:(t,q)=>req('/api/stats/by-day',{token:t,query:q}),
  
  // Utility endpoints
  health:()=>req('/health')
}
