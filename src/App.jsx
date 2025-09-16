import React from 'react'
import { Routes,Route,Navigate } from 'react-router-dom'
import { AuthProvider,useAuth } from './context/AuthContext'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ReceiptsPage from './pages/ReceiptsPage.jsx'
import ReceiptViewPage from './pages/ReceiptViewPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import UserManagementPage from './pages/UserManagementPage.jsx'

function PrivateRoute({children}){
  const {user}=useAuth()
  return user?children:<Navigate to="/login"/>
}

function AdminRoute({children}){
  const {user}=useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/dashboard"/>
}

export default function App(){
  return <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
        <Route path="dashboard" element={<DashboardPage/>}/>
        <Route path="receipts" element={<ReceiptsPage/>}/>
        <Route path="receipts/:id" element={<ReceiptViewPage/>}/>
        <Route path="transactions" element={<TransactionsPage/>}/>
        <Route path="users" element={<AdminRoute><UserManagementPage/></AdminRoute>}/>
      </Route>
    </Routes>
  </AuthProvider>
}
