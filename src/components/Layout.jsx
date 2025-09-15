import React, { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { 
  FiHome, 
  FiFileText, 
  FiClock, 
  FiUsers, 
  FiLogOut, 
  FiUser,
  FiShield,
  FiChevronDown
} from 'react-icons/fi'

export default function Layout(){
  const { user,logout }=useAuth()
  const navigate=useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const handleLogout=()=>{logout();navigate('/login')}
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  const isAdmin = user?.role === 'admin'
  
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: FiHome },
    { to: "/receipts", label: "Create Receipt", icon: FiFileText },
    { to: "/transactions", label: "Transaction History", icon: FiClock },
    ...(isAdmin ? [{ to: "/users", label: "User Management", icon: FiUsers }] : [])
  ]
  
  return <div className="flex h-screen bg-gray-50">
    {/* Sidebar */}
    <aside className="w-72 bg-white shadow-lg border-r border-gray-200">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Logo size={48} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">ECS Receipts</h1>
            <p className="text-sm text-gray-600">Financial Management Portal</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link 
              key={item.to}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-200 group" 
              to={item.to}
            >
              <Icon className="w-5 h-5 group-hover:text-red-600" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
    
    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome back, {user?.name || user?.emp_code}
            </h2>
            {isAdmin && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <FiShield className="w-3 h-3 mr-1" />
                Admin
              </span>
            )}
          </div>
          
          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <FiUser className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || user?.emp_code}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.emp_code}
                </p>
              </div>
              <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name || user?.emp_code}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {user?.branch && (
                    <p className="text-xs text-gray-500">{user?.branch}</p>
                  )}
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                >
                  <FiLogOut className="w-4 h-4 mr-3" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          <Outlet/>
        </div>
      </main>
    </div>
  </div>
}
