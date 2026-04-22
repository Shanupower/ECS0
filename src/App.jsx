import React from 'react'
import { Routes,Route,Navigate,useLocation } from 'react-router-dom'
import { AuthProvider,useAuth } from './context/AuthContext'
import { DarkModeProvider } from './context/DarkModeContext'
import { AppConfigProvider } from './context/AppConfigContext'
import DashboardLayout from './components/DashboardLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import BranchWorkspace from './pages/BranchWorkspace.jsx'
import ReceiptsPage from './pages/ReceiptsPage.jsx'
import ReceiptViewPage from './pages/ReceiptViewPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import UserManagementPage from './pages/UserManagementPage.jsx'
import ClientManagementPage from './pages/ClientManagementPage.jsx'
import SchemeManagementPage from './pages/SchemeManagementPage.jsx'
import IssuesPage from './pages/IssuesPage.jsx'
import MyIssuesPage from './pages/MyIssuesPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import TasksReportsPage from './pages/TasksReportsPage.jsx'
import LeadsPage from './pages/LeadsPage.jsx'
import PortfolioReviewPage from './pages/PortfolioReviewPage.jsx'
import SystemSettingsPage from './pages/SystemSettingsPage.jsx'
import TeamsAdminPage from './pages/TeamsAdminPage.jsx'
import ApprovalsQueuePage from './pages/ApprovalsQueuePage.jsx'
import TokenExpiredModal from './components/TokenExpiredModal.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

// Page Transition Wrapper
function PageTransition({ children }) {
  const location = useLocation()
  
  return (
    <div 
      key={location.pathname}
      className="page-transition-enter"
    >
      {children}
    </div>
  )
}

function PrivateRoute({children}){
  const {user}=useAuth()
  return user?children:<Navigate to="/login"/>
}

function AdminRoute({children}){
  const {user}=useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/dashboard"/>
}

function BranchRoute({children}){
  const {user}=useAuth()
  return (user?.role === 'admin' || user?.role === 'manager') ? children : <Navigate to="/dashboard"/>
}

function ClientRoute({children}){
  const {user}=useAuth()
  return (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'employee') ? children : <Navigate to="/dashboard"/>
}

function AppContent() {
  const { isTokenExpired, clearTokenExpiration } = useAuth()
  
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/" element={<PrivateRoute><DashboardLayout/></PrivateRoute>}>
          <Route 
            path="dashboard" 
            element={<PageTransition><DashboardPage/></PageTransition>}
          />
          <Route
            path="branches"
            element={
              <PageTransition>
                <BranchRoute>
                  <BranchWorkspace />
                </BranchRoute>
              </PageTransition>
            }
          />
          <Route
            path="branch-manager"
            element={<Navigate to="/branches?section=operations" replace />}
          />
          <Route
            path="admin/branches"
            element={
              <PageTransition>
                <AdminRoute>
                  <Navigate to="/branches?section=admin" replace />
                </AdminRoute>
              </PageTransition>
            }
          />
          <Route 
            path="receipts" 
            element={<PageTransition><ReceiptsPage/></PageTransition>}
          />
          <Route 
            path="receipts/:id" 
            element={<PageTransition><ReceiptViewPage/></PageTransition>}
          />
          <Route 
            path="transactions" 
            element={<PageTransition><TransactionsPage/></PageTransition>}
          />
          <Route 
            path="users" 
            element={<PageTransition><AdminRoute><UserManagementPage/></AdminRoute></PageTransition>}
          />
          <Route 
            path="customers" 
            element={<PageTransition><ClientRoute><ClientManagementPage/></ClientRoute></PageTransition>}
          />
          <Route 
            path="schemes" 
            element={<PageTransition><AdminRoute><SchemeManagementPage/></AdminRoute></PageTransition>}
          />
          <Route 
            path="issues" 
            element={<PageTransition><AdminRoute><IssuesPage/></AdminRoute></PageTransition>}
          />
          <Route 
            path="my-issues" 
            element={<PageTransition><MyIssuesPage/></PageTransition>}
          />
          <Route 
            path="tasks" 
            element={<PageTransition><TasksPage/></PageTransition>}
          />
          <Route 
            path="tasks/reports" 
            element={<PageTransition><TasksReportsPage/></PageTransition>}
          />
          <Route 
            path="leads" 
            element={<PageTransition><LeadsPage/></PageTransition>}
          />
          <Route 
            path="portfolio-review" 
            element={<PageTransition><ClientRoute><PortfolioReviewPage/></ClientRoute></PageTransition>}
          />
          <Route
            path="settings"
            element={<PageTransition><BranchRoute><SystemSettingsPage/></BranchRoute></PageTransition>}
          />
          <Route
            path="teams"
            element={<PageTransition><AdminRoute><TeamsAdminPage/></AdminRoute></PageTransition>}
          />
          <Route
            path="approvals"
            element={<PageTransition><ApprovalsQueuePage/></PageTransition>}
          />
        </Route>
      </Routes>
      <TokenExpiredModal isOpen={isTokenExpired} onClose={clearTokenExpiration} />
    </>
  )
}

export default function App(){
  return <DarkModeProvider>
    <AuthProvider>
      <AppConfigProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AppConfigProvider>
    </AuthProvider>
  </DarkModeProvider>
}
