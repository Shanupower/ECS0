/** Only this employee code may open System Settings (nav + route). */
export const SYSTEM_SETTINGS_ALLOWED_EMP_CODE = 'ECS0000'

export function canAccessSystemSettings(user) {
  if (!user) return false
  const branchOk = user.role === 'admin' || user.role === 'manager'
  const emp = String(user.emp_code || '').trim().toUpperCase()
  return branchOk && emp === SYSTEM_SETTINGS_ALLOWED_EMP_CODE
}
