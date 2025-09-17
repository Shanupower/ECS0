import React, { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import DarkModeToggle from './DarkModeToggle'
import { 
  FiHome, 
  FiFileText, 
  FiClock, 
  FiUsers, 
  FiLogOut, 
  FiUser,
  FiShield,
  FiChevronDown,
  FiMenu,
  FiX
} from 'react-icons/fi'

export default function Layout(){
  const { user,logout }=useAuth()
  const navigate=useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-dark-800 shadow-lg border-r border-gray-200 dark:border-dark-700 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size={48} />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ECS Receipts</h1>
                <p className="text-sm text-gray-600 dark:text-dark-300">Financial Management Portal</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-dark-300"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.to}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-dark-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-colors duration-200 group" 
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 group-hover:text-red-600 dark:group-hover:text-red-400" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700 px-4 lg:px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Mobile menu button and title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-dark-300"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Welcome back, {user?.name || user?.emp_code}
                </h2>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                    <FiShield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
              </div>
            </div>
            
            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <DarkModeToggle className="hidden sm:block" />
              
              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800"
                >
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || user?.emp_code}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-400">
                      {user?.emp_code}
                    </p>
                  </div>
                  <FiChevronDown className={`w-4 h-4 text-gray-400 dark:text-dark-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || user?.emp_code}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-400">{user?.email}</p>
                      {user?.branch && (
                        <p className="text-xs text-gray-500 dark:text-dark-400">{user?.branch}</p>
                      )}
                    </div>
                    {/* Mobile dark mode toggle */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-700 sm:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-dark-300">Dark Mode</span>
                        <DarkModeToggle />
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-dark-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 transition-colors duration-200"
                    >
                      <FiLogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-900">
          <div className="p-4 lg:p-6">
            <Outlet/>
          </div>
        </main>
      </div>
    </div>
  )
}
