const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

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

async function reqWithFiles(path,{method='POST',token,formData,query}={}){
  const qs = query ? '?' + new URLSearchParams(query).toString() : ''
  const res = await fetch(BASE+path+qs,{
    method,
    headers:{
      ...authHeaders(token)
      // Don't set Content-Type header - let browser set it with boundary for FormData
    },
    body: formData
  })
  const ct=res.headers.get('content-type')||''
  const data= ct.includes('application/json')?await res.json():await res.text()
  if(!res.ok) throw new Error(data.error||data.message||res.statusText)
  return data
}

function createFormData(data, files) {
  const formData = new FormData()
  
  // Add all data fields
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key])
    }
  })
  
  // Add files
  if (files) {
    if (Array.isArray(files)) {
      files.forEach(file => {
        if (file) formData.append('files', file)
      })
    } else if (files) {
      formData.append('files', files)
    }
  }
  
  return formData
}

export const api={
  // Auth endpoints
  login:(c,p)=>req('/api/auth/login',{method:'POST',json:{emp_code:c,password:p}}),
  branchLogin:(branchName,p)=>req('/api/auth/branch-login',{method:'POST',json:{branch_name:branchName,password:p}}),
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
  createReceipt:(t,p,files)=>files && files.length > 0 ? reqWithFiles('/api/receipts',{method:'POST',token:t,formData:createFormData(p,files)}) : req('/api/receipts',{method:'POST',token:t,json:p}),
  updateReceipt:(t,id,data)=>req(`/api/receipts/${id}`,{method:'PATCH',token:t,json:data}),
  deleteReceipt:(t,id,r)=>req(`/api/receipts/${id}`,{method:'DELETE',token:t,json:{reason:r}}),
  restoreReceipt:(t,id)=>req(`/api/receipts/${id}/restore`,{method:'POST',token:t}),
  updateReceiptStatus:(t,id,status)=>req(`/api/receipts/${id}/status`,{method:'PATCH',token:t,json:{status}}),
  getReceiptMedia:(t,id)=>req(`/api/receipts/${id}/media`,{token:t}),
  downloadReceiptMedia:(t,id,mediaId)=>req(`/api/receipts/${id}/media/${mediaId}`,{token:t}),
  
  // Customer/Investor endpoints
  listCustomers:(t,q)=>req('/api/customers',{token:t,query:q}),
  getCustomer:(t,id)=>req(`/api/customers/${id}`,{token:t}),
  createCustomer:(t,customerData)=>req('/api/customers',{method:'POST',token:t,json:customerData}),
  updateCustomer:(t,id,data)=>req(`/api/customers/${id}`,{method:'PATCH',token:t,json:data}),
  deleteCustomer:(t,id)=>req(`/api/customers/${id}`,{method:'DELETE',token:t}),
  searchCustomers:(t,q)=>req('/api/customers/search',{token:t,query:q}),
  searchInvestors:(t,q)=>req('/api/customers/search',{token:t,query:q}),
  searchInvestorsByBranch:(t,q,branch)=>req('/api/customers/search',{token:t,query:{...q,relationship_manager:branch}}),
  
  // Stats endpoints
  statsSummary:(t,q)=>req('/api/stats/summary',{token:t,query:q}),
  statsByCategory:(t,q)=>req('/api/stats/by-category',{token:t,query:q}),
  statsByDay:(t,q)=>req('/api/stats/by-day',{token:t,query:q}),
  
  // Branch endpoints
  listBranches:(t)=>req('/api/branches',{token:t}),
  getBranch:(t,code)=>req(`/api/branches/${code}`,{token:t}),
  getBranchStats:(t,code)=>req(`/api/branches/${code}/stats`,{token:t}),
  getBranchReceipts:(t,code,q)=>req(`/api/branches/${code}/receipts`,{token:t,query:q}),
  createBranchReceipt:(t,code,data,files)=>files && files.length > 0 ? reqWithFiles(`/api/branches/${code}/receipts`,{method:'POST',token:t,formData:createFormData(data,files)}) : req(`/api/branches/${code}/receipts`,{method:'POST',token:t,json:data}),
  getGlobalBranchStats:(t)=>req('/api/stats/branches',{token:t}),
  
  // Branch management endpoints (admin only)
  createBranch:(t,data)=>req('/api/branches',{method:'POST',token:t,json:data}),
  
  // Issues endpoints
  createIssue:(t,data,files)=>files && files.length > 0 ? reqWithFiles('/api/issues',{method:'POST',token:t,formData:createFormData(data,files)}) : req('/api/issues',{method:'POST',token:t,json:data}),
  listIssues:(t,q)=>req('/api/issues',{token:t,query:q}),
  getIssue:(t,id)=>req(`/api/issues/${id}`,{token:t}),
  updateIssueStatus:(t,id,status)=>req(`/api/issues/${id}/status`,{method:'PATCH',token:t,json:{status}}),
  updateBranch:(t,code,data)=>req(`/api/branches/${code}`,{method:'PUT',token:t,json:data}),
  deleteBranch:(t,code)=>req(`/api/branches/${code}`,{method:'DELETE',token:t}),
  assignUsersToBranch:(t,code,userIds)=>req(`/api/branches/${code}/users`,{method:'POST',token:t,json:{user_ids:userIds}}),
  
  // Export endpoints
  exportReceipts:(t,q)=>req('/api/export/receipts',{token:t,query:q}),
  exportCustomers:(t)=>req('/api/export/customers',{token:t}),
  exportUsers:(t)=>req('/api/export/users',{token:t}),
  exportBranches:(t)=>req('/api/export/branches',{token:t}),
  
  // Utility endpoints
  health:()=>req('/health')
}
