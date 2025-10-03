import React from 'react'
import { Routes,Route,Navigate } from 'react-router-dom'
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
          <Route path="dashboard" element={<DashboardPage/>}/>
          <Route path="branches" element={<BranchRoute><BranchDashboard/></BranchRoute>}/>
          <Route path="admin/branches" element={<AdminRoute><AdminBranchManagement/></AdminRoute>}/>
          <Route path="receipts" element={<ReceiptsPage/>}/>
          <Route path="receipts/:id" element={<ReceiptViewPage/>}/>
          <Route path="transactions" element={<TransactionsPage/>}/>
          <Route path="users" element={<AdminRoute><UserManagementPage/></AdminRoute>}/>
          <Route path="customers" element={<CustomerRoute><CustomerManagementPage/></CustomerRoute>}/>
        </Route>
      </Routes>
    </AuthProvider>
  </DarkModeProvider>
}
