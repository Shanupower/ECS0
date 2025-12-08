import React from 'react'
import { Routes,Route,Navigate,useLocation } from 'react-router-dom'
import { AuthProvider,useAuth } from './context/AuthContext'
import { DarkModeProvider } from './context/DarkModeContext'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import BranchDashboard from './pages/BranchDashboard.jsx'
import AdminBranchManagement from './pages/AdminBranchManagement.jsx'
import ReceiptsPage from './pages/ReceiptsPage.jsx'
import ReceiptViewPage from './pages/ReceiptViewPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import UserManagementPage from './pages/UserManagementPage.jsx'
import CustomerManagementPage from './pages/CustomerManagementPage.jsx'
import SchemeManagementPage from './pages/SchemeManagementPage.jsx'
import IssuesPage from './pages/IssuesPage.jsx'
import MyIssuesPage from './pages/MyIssuesPage.jsx'

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
  return (user?.role === 'admin' || user?.role === 'branch') ? children : <Navigate to="/dashboard"/>
}

function CustomerRoute({children}){
  const {user}=useAuth()
  return (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'employee' || user?.role === 'branch') ? children : <Navigate to="/dashboard"/>
}

export default function App(){
  return <DarkModeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
          <Route 
            path="dashboard" 
            element={<PageTransition><DashboardPage/></PageTransition>}
          />
          <Route 
            path="branches" 
            element={<PageTransition><BranchRoute><BranchDashboard/></BranchRoute></PageTransition>}
          />
          <Route 
            path="admin/branches" 
            element={<PageTransition><AdminRoute><AdminBranchManagement/></AdminRoute></PageTransition>}
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
            element={<PageTransition><CustomerRoute><CustomerManagementPage/></CustomerRoute></PageTransition>}
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
        </Route>
      </Routes>
    </AuthProvider>
  </DarkModeProvider>
}
