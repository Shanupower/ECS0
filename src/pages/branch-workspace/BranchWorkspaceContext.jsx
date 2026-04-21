import { createContext, useContext } from 'react'

export const BranchWorkspaceContext = createContext({
  embedded: false,
  section: 'analytics',
  setPrimaryAction: () => {},
  refreshSignal: 0,
  // 'my_branch' | 'all_branches'. Non-admins are always 'my_branch'.
  scope: 'my_branch',
  setScope: () => {},
  canSwitchScope: false,
  // Include pending + null-status receipts in aggregations. Global toggle for all sections.
  includePending: true,
  setIncludePending: () => {},
  // When scope === 'my_branch' and the user is admin, this is the branch_code being focused.
  // Non-admins use their assigned branch; the picker is hidden.
  focusedBranchCode: null,
  setFocusedBranchCode: () => {},
})

export function useBranchWorkspace() {
  return useContext(BranchWorkspaceContext)
}
