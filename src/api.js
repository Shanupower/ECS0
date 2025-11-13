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
  downloadReceiptPDF:(t,id)=>req(`/api/receipts/${id}/pdf`,{token:t}),
  
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
  health:()=>req('/health'),
  
  // MF Schemes endpoints
  listAMCs:(t)=>req('/api/schemes/amcs',{token:t}),
  getSchemesByAMC:(t,amc_code)=>req(`/api/schemes/amc/${amc_code}`,{token:t}),
  getScheme:(t,scheme_code)=>req(`/api/schemes/${scheme_code}`,{token:t}),
  createAMC:(t,data)=>req('/api/schemes/amc',{method:'POST',token:t,json:data}),
  updateAMC:(t,amc_code,data)=>req(`/api/schemes/amc/${amc_code}`,{method:'PUT',token:t,json:data}),
  deleteAMC:(t,amc_code)=>req(`/api/schemes/amc/${amc_code}`,{method:'DELETE',token:t}),
  createScheme:(t,data)=>req('/api/schemes',{method:'POST',token:t,json:data}),
  updateScheme:(t,scheme_code,data)=>req(`/api/schemes/${scheme_code}`,{method:'PUT',token:t,json:data}),
  deleteScheme:(t,scheme_code)=>req(`/api/schemes/${scheme_code}`,{method:'DELETE',token:t}),
  checkNfoValidity:(t)=>req('/api/schemes/check-nfo-validity',{method:'POST',token:t}),
  expandPreview:(t,data)=>req('/api/schemes/expand-preview',{method:'POST',token:t,json:data}),
  commitVariants:(t,data)=>req('/api/schemes/commit-variants',{method:'POST',token:t,json:data}),
  checkDuplicate:(t,params)=>req('/api/schemes/check-duplicate',{token:t,query:params}),
  
  // FD Schemes endpoints (nested structure)
  listFDIssuers:(t)=>req('/api/fd-schemes/issuers',{token:t}),
  getFDIssuer:(t,issuer_key)=>req(`/api/fd-schemes/issuer/${issuer_key}`,{token:t}),
  getFDSchemesByIssuer:(t,issuer_key)=>req(`/api/fd-schemes/issuer/${issuer_key}/schemes`,{token:t}),
  getFDScheme:(t,issuer_key,scheme_id)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{token:t}),
  getFDRateSlabs:(t,issuer_key,scheme_id)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}/slabs`,{token:t}),
  calculateFDRate:(t,data)=>req('/api/fd-schemes/calculate-rate',{method:'POST',token:t,json:data}),
  createFDIssuer:(t,data)=>req('/api/fd-schemes/issuer',{method:'POST',token:t,json:data}),
  updateFDIssuer:(t,issuer_key,data)=>req(`/api/fd-schemes/issuer/${issuer_key}`,{method:'PUT',token:t,json:data}),
  deleteFDIssuer:(t,issuer_key)=>req(`/api/fd-schemes/issuer/${issuer_key}`,{method:'DELETE',token:t}),
  createFDScheme:(t,issuer_key,schemeData)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme`,{method:'POST',token:t,json:schemeData}),
  updateFDScheme:(t,issuer_key,scheme_id,data)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{method:'PUT',token:t,json:data}),
  deleteFDScheme:(t,issuer_key,scheme_id)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{method:'DELETE',token:t}),
  createFDRateSlab:(t,issuer_key,scheme_id,slabData)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}/slab`,{method:'POST',token:t,json:slabData}),
  updateFDRateSlab:(t,issuer_key,scheme_id,slab_id,data)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}/slab/${slab_id}`,{method:'PUT',token:t,json:data}),
  deleteFDRateSlab:(t,issuer_key,scheme_id,slab_id)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}/slab/${slab_id}`,{method:'DELETE',token:t})
}
