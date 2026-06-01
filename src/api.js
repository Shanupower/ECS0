const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// Token expiration callback
let tokenExpirationCallback = null

export function setTokenExpirationCallback(callback) {
  tokenExpirationCallback = callback
}

function authHeaders(token){ return token ? { Authorization: `Bearer ${token}` } : {} }

async function req(path,{method='GET',token,json,query,headers}={}){
  const qs = query ? '?' + new URLSearchParams(query).toString() : ''
  const res = await fetch(BASE+path+qs,{
    method,
    headers:{
      ...(json?{'Content-Type':'application/json'}:{}),
      ...authHeaders(token),
      ...(headers || {})
    },
    body: json?JSON.stringify(json):undefined
  })
  if (res.status === 204) return null
  const ct=res.headers.get('content-type')||''
  const data= ct.includes('application/json')?await res.json():await res.text()
  if(!res.ok) {
    // Check for 401 (unauthorized) - token expired or invalid
    if (res.status === 401 && tokenExpirationCallback) {
      tokenExpirationCallback()
    }
    const error = new Error(data.detail || data.error || data.message || res.statusText)
    // Preserve full error object for field-specific error handling
    if (typeof data === 'object' && data !== null) {
      error.field = data.field
      error.errorType = data.error
      error.detail = data.detail
    }
    throw error
  }
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
  if(!res.ok) {
    // Check for 401 (unauthorized) - token expired or invalid
    if (res.status === 401 && tokenExpirationCallback) {
      tokenExpirationCallback()
    }
    throw new Error(data.error||data.message||res.statusText)
  }
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

// Receipt creation with files: send payload as JSON so nested objects (e.g. transaction_details) survive multipart.
// Append payload first so server parsers reliably get payment/transaction_details.
function createReceiptFormData(data, files) {
  const formData = new FormData()
  formData.append('payload', JSON.stringify(data))
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

function createIssueFormData(data, file) {
  const formData = new FormData()
  
  // Add all data fields
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key])
    }
  })
  
  // Add file with 'screenshot' field name for issues
  if (file) {
    formData.append('screenshot', file)
  }
  
  return formData
}

export const api={
  // Auth endpoints
  login:(c,p)=>req('/api/auth/login',{method:'POST',json:{emp_code:c,password:p}}),
  register:(data)=>req('/api/auth/register',{method:'POST',json:data}),
  impersonate:(t,empCode)=>req('/api/auth/impersonate',{method:'POST',token:t,json:{emp_code:empCode}}),
  
  // User endpoints
  me:(t)=>req('/api/users/me',{token:t}),
  updateMyProfile:(t,data)=>req('/api/users/me',{method:'PATCH',token:t,json:data}),
  listUsers:(t,q)=>req('/api/users',{token:t,query:q}),
  listAssignableUsers:(t)=>req('/api/users/assignable',{token:t}),
  createUser:(t,data)=>req('/api/users',{method:'POST',token:t,json:data}),
  updateUser:(t,id,data)=>req(`/api/users/${id}`,{method:'PATCH',token:t,json:data}),
  changePassword:(t,id,password)=>req(`/api/users/${id}/password`,{method:'PATCH',token:t,json:{password}}),
  deleteUser:(t,id)=>req(`/api/users/${id}`,{method:'DELETE',token:t}),
  deleteUserRelatedData:(t,id)=>req(`/api/users/${id}/related-data`,{method:'DELETE',token:t}),
  
  // Receipt endpoints
  listReceipts:(t,q)=>req('/api/receipts',{token:t,query:q}),
  getReceipt:(t,id)=>req(`/api/receipts/${id}`,{token:t}),
  getReceiptsByEmpCode:(t,empCode,q)=>req(`/api/receipts/emp/${empCode}`,{token:t,query:q}),
  getTransactionSummary:(t,q)=>req('/api/receipts/summary',{token:t,query:q}),
  createReceipt:(t,p,files)=>files && files.length > 0 ? reqWithFiles('/api/receipts',{method:'POST',token:t,formData:createReceiptFormData(p,files)}) : req('/api/receipts',{method:'POST',token:t,json:p}),
  updateReceipt:(t,id,data)=>req(`/api/receipts/${id}`,{method:'PATCH',token:t,json:data}),
  deleteReceipt:(t,id,r)=>req(`/api/receipts/${id}`,{method:'DELETE',token:t,json:{reason:r}}),
  restoreReceipt:(t,id)=>req(`/api/receipts/${id}/restore`,{method:'POST',token:t}),
  updateReceiptStatus:(t,id,status)=>req(`/api/receipts/${id}/status`,{method:'PATCH',token:t,json:{status}}),
  updateReceiptBonus:(t,id,bonusData)=>req(`/api/receipts/${id}/bonus`,{method:'PUT',token:t,json:bonusData}),
  getReceiptMedia:(t,id)=>req(`/api/receipts/${id}/media`,{token:t}),
  downloadReceiptMedia:(t,id,mediaId)=>req(`/api/receipts/${id}/media/${mediaId}`,{token:t}),
  downloadReceiptPDF:(t,id)=>req(`/api/receipts/${id}/pdf`,{token:t}),
  // `meta` is an optional plain object whose fields are posted alongside the
  // files as form fields. Use it to tag approval-evidence uploads, e.g.
  // { category: 'approval_evidence', cycle_id, team_id, team_name, uploaded_during }.
  uploadReceiptMedia:(t,id,files,meta)=>reqWithFiles(`/api/receipts/${id}/media`,{method:'POST',token:t,formData:createFormData(meta||{},files)}),
  createReceiptDraft:(t,data)=>req('/api/receipt-drafts',{method:'POST',token:t,json:data}),
  getReceiptDraft:(t,id)=>req(`/api/receipt-drafts/${id}`,{token:t}),
  listReceiptDrafts:(t)=>req('/api/receipt-drafts',{token:t}),
  deleteReceiptDraft:(t,id)=>req(`/api/receipt-drafts/${id}`,{method:'DELETE',token:t}),
  getRecentReceipts:(t,limit=10)=>req('/api/receipts/recent',{token:t,query:{limit}}),
  checkReceiptDuplicate:(t,params)=>req('/api/receipts/check-duplicate',{token:t,query:params}),
  
  // Customer/Investor endpoints
  listCustomers:(t,q)=>req('/api/customers',{token:t,query:q}),
  getCustomer:(t,id)=>req(`/api/customers/${id}`,{token:t}),
  createCustomer:(t,customerData)=>req('/api/customers',{method:'POST',token:t,json:customerData}),
  updateCustomer:(t,id,data)=>req(`/api/customers/${id}`,{method:'PATCH',token:t,json:data}),
  uploadCustomerMedia:(t,id,files)=>reqWithFiles(`/api/customers/${id}/media`,{method:'POST',token:t,formData:createFormData({},files)}),
  deleteCustomerMedia:(t,id,mediaId)=>req(`/api/customers/${id}/media/${mediaId}`,{method:'DELETE',token:t}),
  getPortfolioReview:(t,q)=>req('/api/customers/portfolio-review',{token:t,query:q}),
  deleteCustomer:(t,id)=>req(`/api/customers/${id}`,{method:'DELETE',token:t}),
  searchCustomers:(t,q)=>req('/api/customers/search',{token:t,query:q}),
  searchInvestors:(t,q)=>req('/api/customers/search',{token:t,query:q}),
  searchInvestorsByBranch:(t,q,_branch)=>req('/api/customers/search',{token:t,query:q}),
  
  // Stats endpoints
  statsSummary:(t,q)=>req('/api/stats/summary',{token:t,query:q}),
  statsByCategory:(t,q)=>req('/api/stats/by-category',{token:t,query:q}),
  statsByDay:(t,q)=>req('/api/stats/by-day',{token:t,query:q}),
  getMonthlyCCSI:(t,q)=>req('/api/stats/monthly-cc-si',{token:t,query:q}),
  getStatsSummary:(t,q)=>req('/api/stats/summary',{token:t,query:q}),
  getStatsByCategory:(t,q)=>req('/api/stats/by-category',{token:t,query:q}),
  getStatsByDay:(t,q)=>req('/api/stats/by-day',{token:t,query:q}),
  getMonthlyCcSi:(t,q)=>req('/api/stats/monthly-cc-si',{token:t,query:q}),
  
  // Branch endpoints
  listBranches:(t,q)=>req('/api/branches',{token:t,query:q}),
  getBranch:(t,code)=>req(`/api/branches/${code}`,{token:t}),
  getBranchStats:(t,code,q)=>req(`/api/branches/${code}/stats`,{token:t,query:q}),
  getGlobalBranchStats:(t,q)=>req('/api/stats/branches',{token:t,query:q}),
  getEmployeePerformance:(t,q)=>req('/api/stats/employees/performance',{token:t,query:q}),
  getInvestorLocations:(t,q)=>req('/api/stats/investor-locations',{token:t,query:q}),
  getBranchQueueMetrics:(t,q)=>req('/api/stats/branch-queue-metrics',{token:t,query:q}),
  getBranchReceipts:(t,code,q)=>req(`/api/branches/${code}/receipts`,{token:t,query:q}),
  createBranchReceipt:(t,code,data,files)=>files && files.length > 0 ? reqWithFiles(`/api/branches/${code}/receipts`,{method:'POST',token:t,formData:createReceiptFormData(data,files)}) : req(`/api/branches/${code}/receipts`,{method:'POST',token:t,json:data}),

  // Audit (branch manager power tool)
  getBranchAuditEvents:(t,q)=>req('/api/audit/branch',{token:t,query:q}),
  
  // Branch management endpoints (admin only)
  createBranch:(t,data)=>req('/api/branches',{method:'POST',token:t,json:data}),
  
  // Issues endpoints
  createIssue:(t,data,files)=>{
    // Check if files exists - could be a single file or an array
    if (files) {
      // For issues, use the first file with 'screenshot' field name
      const file = Array.isArray(files) ? (files.length > 0 ? files[0] : null) : files
      if (file) {
        return reqWithFiles('/api/issues',{method:'POST',token:t,formData:createIssueFormData(data,file)})
      }
    }
    return req('/api/issues',{method:'POST',token:t,json:data})
  },
  listIssues:(t,q)=>req('/api/issues',{token:t,query:q}),
  listMyIssues:(t,q)=>req('/api/issues/my',{token:t,query:q}),
  getIssue:(t,id)=>req(`/api/issues/${id}`,{token:t}),
  updateIssueStatus:(t,id,status)=>req(`/api/issues/${id}/status`,{method:'PATCH',token:t,json:{status}}),
  updateIssuePriority:(t,id,priority)=>req(`/api/issues/${id}/priority`,{method:'PATCH',token:t,json:{priority}}),
  addIssueFix:(t,id,fixText)=>req(`/api/issues/${id}/fix`,{method:'POST',token:t,json:{fix_text:fixText}}),
  updateBranch:(t,code,data)=>req(`/api/branches/${code}`,{method:'PUT',token:t,json:data}),
  deleteBranch:(t,code)=>req(`/api/branches/${code}`,{method:'DELETE',token:t}),
  assignUsersToBranch:(t,code,userIds)=>req(`/api/branches/${code}/users`,{method:'POST',token:t,json:{user_ids:userIds}}),

  // Tasks endpoints (redesigned)
  listTasks:(t,q)=>req('/api/tasks',{token:t,query:q}),
  searchTasks:(t,body)=>req('/api/tasks/search',{method:'POST',token:t,json:body}),
  getTasksStats:(t)=>req('/api/tasks/stats',{token:t}),
  getMyTasks:(t)=>req('/api/tasks/my',{token:t}),
  getTasksByEntity:(t,type,id)=>req(`/api/tasks/entity/${type}/${id}`,{token:t}),
  getTask:(t,id)=>req(`/api/tasks/${id}`,{token:t}),
  createTask:(t,data)=>req('/api/tasks',{method:'POST',token:t,json:data}),
  updateTask:(t,id,data)=>req(`/api/tasks/${id}`,{method:'PATCH',token:t,json:data}),
  bulkUpdateTasks:(t,ids,patch)=>req('/api/tasks/bulk-update',{method:'POST',token:t,json:{ids,patch}}),
  deleteTask:(t,id)=>req(`/api/tasks/${id}`,{method:'DELETE',token:t}),
  listSubtasks:(t,id)=>req(`/api/tasks/${id}/subtasks`,{token:t}),
  createSubtask:(t,id,data)=>req(`/api/tasks/${id}/subtasks`,{method:'POST',token:t,json:data}),
  listTaskWatchers:(t,id)=>req(`/api/tasks/${id}/watchers`,{token:t}),
  addTaskWatcher:(t,id,userId)=>req(`/api/tasks/${id}/watchers`,{method:'POST',token:t,json:{user_id:userId}}),
  removeTaskWatcher:(t,id,uid)=>req(`/api/tasks/${id}/watchers/${uid}`,{method:'DELETE',token:t}),
  listTaskComments:(t,id)=>req(`/api/tasks/${id}/comments`,{token:t}),
  createTaskComment:(t,id,data)=>req(`/api/tasks/${id}/comments`,{method:'POST',token:t,json:data}),
  deleteTaskComment:(t,id,cid)=>req(`/api/tasks/${id}/comments/${cid}`,{method:'DELETE',token:t}),
  listTaskActivities:(t,id)=>req(`/api/tasks/${id}/activities`,{token:t}),
  listTaskAttachments:(t,id)=>req(`/api/tasks/${id}/attachments`,{token:t}),
  uploadTaskAttachments:(t,id,files)=>reqWithFiles(`/api/tasks/${id}/attachments`,{method:'POST',token:t,formData:createFormData({},files)}),
  deleteTaskAttachment:(t,id,aid)=>req(`/api/tasks/${id}/attachments/${aid}`,{method:'DELETE',token:t}),

  // Leads endpoints
  listLeads:(t,q)=>req('/api/leads',{token:t,query:q}),
  getLead:(t,id)=>req(`/api/leads/${id}`,{token:t}),
  createLead:(t,data)=>req('/api/leads',{method:'POST',token:t,json:data}),
  updateLead:(t,id,data)=>req(`/api/leads/${id}`,{method:'PATCH',token:t,json:data}),
  convertLeadToCustomer:(t,id,data)=>req(`/api/leads/${id}/convert`,{method:'POST',token:t,json:data}),
  deleteLead:(t,id)=>req(`/api/leads/${id}`,{method:'DELETE',token:t}),
  reactivateLead:(t,id)=>req(`/api/leads/${id}/reactivate`,{method:'POST',token:t,json:{}}),
  listLeadActivities:(t,id)=>req(`/api/leads/${id}/activities`,{token:t}),
  createLeadActivity:(t,id,data)=>req(`/api/leads/${id}/activities`,{method:'POST',token:t,json:data}),

  // Portfolio review bulk + history
  bulkUpdatePortfolioReview:(t,body)=>req('/api/customers/portfolio-review/bulk-update',{method:'POST',token:t,json:body}),
  getCustomerReviewHistory:(t,id)=>req(`/api/customers/${id}/review-history`,{token:t}),
  getCustomerTimeline:(t,id,q)=>req(`/api/customers/${id}/timeline`,{token:t,query:q}),

  // App config
  getAppConfig:(t)=>req('/api/app-config',{token:t}),
  updateAppConfig:(t,body)=>req('/api/app-config',{method:'PUT',token:t,json:body}),
  migrateReceiptIntake:(t,payload)=>req('/api/receipts/approvals/migrate-intake',{method:'POST',token:t,json:payload}),

  // Notifications (in-app bell)
  listNotifications:(t,q)=>req('/api/notifications',{token:t,query:q}),
  markNotificationsRead:(t,ids)=>req('/api/notifications/mark-read',{method:'POST',token:t,json:{ids}}),
  deleteNotification:(t,id)=>req(`/api/notifications/${id}`,{method:'DELETE',token:t}),

  // Task reports (aggregated)
  getTasksReports:(t,q)=>req('/api/tasks/reports',{token:t,query:q}),

  // Shift hand-offs
  createHandoff:(t,body)=>req('/api/handoffs',{method:'POST',token:t,json:body}),
  listHandoffInbox:(t)=>req('/api/handoffs/inbox',{token:t}),
  acknowledgeHandoff:(t,id)=>req(`/api/handoffs/${id}/acknowledge`,{method:'POST',token:t,json:{}}),
  getHandoffSuggestion:(t)=>req('/api/handoffs/suggest-eod',{token:t}),

  // Task templates
  listTaskTemplates:(t)=>req('/api/task-templates',{token:t}),
  createTaskTemplate:(t,data)=>req('/api/task-templates',{method:'POST',token:t,json:data}),
  updateTaskTemplate:(t,id,data)=>req(`/api/task-templates/${id}`,{method:'PATCH',token:t,json:data}),
  deleteTaskTemplate:(t,id)=>req(`/api/task-templates/${id}`,{method:'DELETE',token:t}),
  runTaskTemplate:(t,id)=>req(`/api/task-templates/${id}/run`,{method:'POST',token:t,json:{}}),

  // Task AI (Phase 4 — heuristics + pluggable LLM)
  aiSummarizeTask:(t,task_id)=>req('/api/task-ai/summarize',{method:'POST',token:t,json:{task_id}}),
  aiSuggestAssignee:(t,body)=>req('/api/task-ai/suggest-assignee',{method:'POST',token:t,json:body}),
  aiSuggestRule:(t,prompt)=>req('/api/task-ai/suggest-rule',{method:'POST',token:t,json:{prompt}}),
  aiScheduleTask:(t,body)=>req('/api/task-ai/schedule',{method:'POST',token:t,json:body}),
  aiNlFilter:(t,prompt)=>req('/api/task-ai/nl-filter',{method:'POST',token:t,json:{prompt}}),

  // Export endpoints
  exportReceipts:(t,q)=>req('/api/export/receipts',{token:t,query:q}),
  exportTransactions:(t,q)=>req('/api/export/transactions',{token:t,query:q}),
  exportCustomers:(t,masterKey)=>{
    const headers = { ...authHeaders(t) }
    if (masterKey) headers['X-Master-Key'] = masterKey
    return fetch(`${BASE}/api/export/customers`, { method: 'GET', headers }).then(async res => {
      if (!res.ok) {
        if (res.status === 401 && tokenExpirationCallback) tokenExpirationCallback()
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || res.statusText)
      }
      return res.blob()
    })
  },
  importCustomers:(t,masterKey,file)=>{
    const form = new FormData()
    form.append('file', file)
    const headers = { ...authHeaders(t) }
    if (masterKey) headers['X-Master-Key'] = masterKey
    return fetch(`${BASE}/api/export/customers/import`, { method: 'POST', headers, body: form }).then(async res => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401 && tokenExpirationCallback) tokenExpirationCallback()
        throw new Error(data.detail || data.error || res.statusText)
      }
      return data
    })
  },
  exportUsers:(t)=>req('/api/export/users',{token:t}),
  exportBranches:(t)=>req('/api/export/branches',{token:t}),
  
  // Utility endpoints
  health:()=>req('/health'),
  
  // MF Schemes endpoints
  getCategoryMinimums:()=>req('/api/schemes/category-minimums'),
  updateCategoryMinimums:(t,minimums)=>req('/api/schemes/category-minimums',{method:'PUT',token:t,json:{minimums}}),
  listAMCs:(t)=>req('/api/schemes/amcs',{token:t}),
  getSchemesByAMC:(t,amc_code,amc_category)=>{
    const qs = amc_category ? `?amc_category=${encodeURIComponent(amc_category)}` : ''
    return req(`/api/schemes/amc/${amc_code}${qs}`,{token:t})
  },
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
  exportSchemesExcel:(t,amc_code)=>{
    const qs = amc_code ? `?amc_code=${encodeURIComponent(amc_code)}` : ''
    return fetch(`${BASE}/api/schemes/export/excel${qs}`, {
      headers: authHeaders(t)
    }).then(async res => {
      if (!res.ok) {
        // Check for 401 (unauthorized) - token expired or invalid
        if (res.status === 401 && tokenExpirationCallback) {
          tokenExpirationCallback()
        }
        let errorMessage = 'Export failed'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage
        } catch (e) {
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      return res.blob()
    })
  },
  importSchemesExcel:(t,file)=>{
    const formData = new FormData()
    formData.append('excelFile', file)
    return reqWithFiles('/api/schemes/import/excel',{method:'POST',token:t,formData})
  },
  
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
  deleteFDRateSlab:(t,issuer_key,scheme_id,slab_id)=>req(`/api/fd-schemes/issuer/${issuer_key}/scheme/${scheme_id}/slab/${slab_id}`,{method:'DELETE',token:t}),
  exportFDSchemesExcel:(t,issuer_key)=>{
    const qs = issuer_key ? `?issuer_key=${encodeURIComponent(issuer_key)}` : ''
    return fetch(`${BASE}/api/fd-schemes/export/excel${qs}`, {
      headers: authHeaders(t)
    }).then(async res => {
      if (!res.ok) {
        if (res.status === 401 && tokenExpirationCallback) {
          tokenExpirationCallback()
        }
        let errorMessage = 'Export failed'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage
        } catch (e) {
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      return res.blob()
    })
  },
  importFDSchemesExcel:(t,file)=>{
    const formData = new FormData()
    formData.append('excelFile', file)
    return reqWithFiles('/api/fd-schemes/import/excel',{method:'POST',token:t,formData})
  },
  
  // NCD/Bond Schemes endpoints (nested structure)
  listNCDBondIssuers:(t)=>req('/api/ncd-bonds-schemes/issuers',{token:t}),
  listNCDBondReceiptSchemes:(t,segment)=>req('/api/ncd-bonds-schemes/receipt-schemes',{token:t,query:{segment}}),
  getNCDBondIssuer:(t,issuer_key)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}`,{token:t}),
  getNCDBondSchemesByIssuer:(t,issuer_key)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}/schemes`,{token:t}),
  getNCDBondScheme:(t,issuer_key,scheme_id)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{token:t}),
  createNCDBondIssuer:(t,data)=>req('/api/ncd-bonds-schemes/issuer',{method:'POST',token:t,json:data}),
  updateNCDBondIssuer:(t,issuer_key,data)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}`,{method:'PUT',token:t,json:data}),
  deleteNCDBondIssuer:(t,issuer_key)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}`,{method:'DELETE',token:t}),
  createNCDBondScheme:(t,issuer_key,schemeData)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}/scheme`,{method:'POST',token:t,json:schemeData}),
  updateNCDBondScheme:(t,issuer_key,scheme_id,data)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{method:'PUT',token:t,json:data}),
  deleteNCDBondScheme:(t,issuer_key,scheme_id)=>req(`/api/ncd-bonds-schemes/issuer/${issuer_key}/scheme/${scheme_id}`,{method:'DELETE',token:t}),
  exportNCDBondSchemesExcel:(t,issuer_key)=>{
    // Export all when issuer_key is null/undefined/empty
    const qs = (issuer_key != null && issuer_key !== '') ? `?issuer_key=${encodeURIComponent(issuer_key)}` : ''
    return fetch(`${BASE}/api/ncd-bonds-schemes/export/excel${qs}`, {
      headers: authHeaders(t)
    }).then(async res => {
      if (!res.ok) {
        if (res.status === 401 && tokenExpirationCallback) {
          tokenExpirationCallback()
        }
        let errorMessage = 'Export failed'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage
        } catch (e) {
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      return res.blob()
    })
  },
  importNCDBondSchemesExcel:(t,file)=>{
    const formData = new FormData()
    formData.append('excelFile', file)
    return reqWithFiles('/api/ncd-bonds-schemes/import/excel',{method:'POST',token:t,formData})
  },
  
  // Insurance Schemes endpoints (nested structure: issuer -> products -> riders)
  listInsuranceIssuers:(t)=>req('/api/insurance-schemes/issuers',{token:t}),
  getInsuranceIssuer:(t,issuer_key)=>req(`/api/insurance-schemes/issuer/${issuer_key}`,{token:t}),
  getInsuranceProducts:(t,issuer_key,active_only='true')=>req(`/api/insurance-schemes/issuer/${issuer_key}/products`,{token:t,query:{active_only}}),
  getInsuranceProduct:(t,issuer_key,product_id)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}`,{token:t}),
  getInsuranceRiders:(t,issuer_key,product_id)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}/riders`,{token:t}),
  createInsuranceIssuer:(t,data)=>req('/api/insurance-schemes/issuer',{method:'POST',token:t,json:data}),
  updateInsuranceIssuer:(t,issuer_key,data)=>req(`/api/insurance-schemes/issuer/${issuer_key}`,{method:'PUT',token:t,json:data}),
  deleteInsuranceIssuer:(t,issuer_key)=>req(`/api/insurance-schemes/issuer/${issuer_key}`,{method:'DELETE',token:t}),
  createInsuranceProduct:(t,issuer_key,data)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product`,{method:'POST',token:t,json:data}),
  updateInsuranceProduct:(t,issuer_key,product_id,data)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}`,{method:'PUT',token:t,json:data}),
  deleteInsuranceProduct:(t,issuer_key,product_id)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}`,{method:'DELETE',token:t}),
  createInsuranceRider:(t,issuer_key,product_id,data)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}/rider`,{method:'POST',token:t,json:data}),
  updateInsuranceRider:(t,issuer_key,product_id,rider_id,data)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}/rider/${rider_id}`,{method:'PUT',token:t,json:data}),
  deleteInsuranceRider:(t,issuer_key,product_id,rider_id)=>req(`/api/insurance-schemes/issuer/${issuer_key}/product/${product_id}/rider/${rider_id}`,{method:'DELETE',token:t}),
  exportInsuranceSchemesExcel:(t,issuer_key)=>{
    const qs = issuer_key ? `?issuer_key=${encodeURIComponent(issuer_key)}` : ''
    return fetch(BASE+`/api/insurance-schemes/export/excel${qs}`,{
      method:'GET',
      headers: authHeaders(t)
    }).then(async res => {
      if (!res.ok) {
        if (res.status === 401 && tokenExpirationCallback) {
          tokenExpirationCallback()
        }
        let errorMessage = 'Export failed'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (e) {
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get('content-disposition')
      const filename = contentDisposition ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') : 'insurance-schemes-export.xlsx'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
  },
  importInsuranceSchemesExcel:(t,file)=>{
    const formData = new FormData()
    formData.append('excelFile', file)
    return reqWithFiles('/api/insurance-schemes/import/excel',{method:'POST',token:t,formData})
  },
  
  // Misc Services Schemes endpoints
  getMiscServicesScheme:(t)=>req('/api/misc-services-schemes',{token:t}),
  updateMiscServicesScheme:(t,data)=>req('/api/misc-services-schemes',{method:'PUT',token:t,json:data}),
  calculateMiscServicesCCSI:(t,price)=>req('/api/misc-services-schemes/calculate-cc-si',{method:'POST',token:t,json:{price}}),

  // -------------------------------------------------------------------------
  // Receipt approval workflow (v2) — teams + engine actions.
  // See backend: services/receipt-stage-engine.js, routes/teams.js
  // -------------------------------------------------------------------------
  listTeams:(t,q)=>req('/api/teams',{token:t,query:q}),
  getTeam:(t,id)=>req(`/api/teams/${id}`,{token:t}),
  createTeam:(t,data)=>req('/api/teams',{method:'POST',token:t,json:data}),
  updateTeam:(t,id,data)=>req(`/api/teams/${id}`,{method:'PATCH',token:t,json:data}),
  deleteTeam:(t,id)=>req(`/api/teams/${id}`,{method:'DELETE',token:t}),
  getTeamWorkload:(t,id)=>req(`/api/teams/${id}/workload`,{token:t}),

  // Each action accepts an optional array of `attachment_ids` referencing files
  // already uploaded via `uploadReceiptMedia` with category 'approval_evidence'.
  submitReceipt:(t,id,attachmentIds)=>req(`/api/receipts/${id}/submit`,{method:'POST',token:t,json:{attachment_ids:attachmentIds||[]}}),
  routeReceipt:(t,id,nextTeamId,comment,attachmentIds)=>req(`/api/receipts/${id}/route`,{method:'POST',token:t,json:{next_team_id:nextTeamId,comment:comment||null,attachment_ids:attachmentIds||[]}}),
  completeReceipt:(t,id,comment,attachmentIds)=>req(`/api/receipts/${id}/complete`,{method:'POST',token:t,json:{comment:comment||null,attachment_ids:attachmentIds||[]}}),
  rejectReceipt:(t,id,comment,attachmentIds)=>req(`/api/receipts/${id}/reject`,{method:'POST',token:t,json:{comment,attachment_ids:attachmentIds||[]}}),
  getReceiptApprovalHistory:(t,id)=>req(`/api/receipts/${id}/history`,{token:t}),
  // Admin-only override wrapper around PATCH /status with required audit reason.
  // shape: { complete?, reject?, next_team_id?, comment?, status? }
  adminOverrideReceipt:(t,id,payload,reason)=>req(`/api/receipts/${id}/status`,{
    method:'PATCH', token:t, json:payload, headers:{ 'x-admin-reason': reason }
  }),

  // Receipt-migration job (admin-only). Used by System Settings when an admin
  // changes intake-team configuration to forcibly route existing in-flight
  // receipts to the new intake teams.
  // patch: { receipt_intake_team_id?, receipt_intake_teams_by_category? }
  previewReceiptMigration:(t,patch)=>req('/api/receipt-approvals/migration/preview',{method:'POST',token:t,json:patch||{}}),
  startReceiptMigration:(t,patch)=>req('/api/receipt-approvals/migration/run',{method:'POST',token:t,json:patch||{}}),
  getReceiptMigrationJob:(t,jobId)=>req(`/api/receipt-approvals/migration/run/${jobId}`,{token:t}),

  // Convenience helper used by approval modals: uploads `files` as approval
  // evidence tagged with the current cycle/team/stage and returns the array
  // of new file IDs that can be passed to the action endpoints.
  uploadApprovalEvidence:async (t,receiptId,files,{cycleId,teamId,teamName,uploadedDuring})=>{
    if (!files || !files.length) return []
    const meta = {
      category: 'approval_evidence',
      cycle_id: cycleId || '',
      team_id: teamId || '',
      team_name: teamName || '',
      uploaded_during: uploadedDuring || ''
    }
    const res = await reqWithFiles(`/api/receipts/${receiptId}/media`, {
      method: 'POST', token: t, formData: createFormData(meta, files)
    })
    const uploaded = Array.isArray(res?.files) ? res.files : []
    return uploaded.map(f => String(f.id)).filter(Boolean)
  },

  // -------------------------------------------------------------------------
  // Reports / Business Analytics (GET /api/reports/*)
  // -------------------------------------------------------------------------
  reportsRegistry:(t)=>req('/api/reports/registry',{token:t}),
  reportsFilterOptions:(t)=>req('/api/reports/filter-options',{token:t}),
  reportsMisSummary:(t,q)=>req('/api/reports/mis-summary',{token:t,query:q}),
  reportsMisTransactions:(t,q)=>req('/api/reports/mis-transactions',{token:t,query:q}),
  reportsProductSales:(t,q)=>req('/api/reports/product-sales',{token:t,query:q}),
  reportsProductDetail:(t,q)=>req('/api/reports/product-detail',{token:t,query:q}),
  reportsCategorySummary:(t,q)=>req('/api/reports/category-summary',{token:t,query:q}),
  reportsMfCategory:(t,q)=>req('/api/reports/mf-category',{token:t,query:q}),
  reportsMfFund:(t,q)=>req('/api/reports/mf-fund',{token:t,query:q}),
  reportsSipReport:(t,q)=>req('/api/reports/sip-report',{token:t,query:q}),
  reportsFdMaturity:(t,q)=>req('/api/reports/fd-maturity',{token:t,query:q}),
  reportsCashflow:(t,q)=>req('/api/reports/cashflow',{token:t,query:q}),
  reportsPendingReceipts:(t,q)=>req('/api/reports/pending-receipts',{token:t,query:q}),
  reportsCustomerDetail:(t,q)=>req('/api/reports/customer-detail',{token:t,query:q})
}
