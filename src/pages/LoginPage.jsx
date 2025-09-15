import React,{useState} from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { FiUser, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi'

export default function LoginPage(){
  const { login }=useAuth()
  const [emp,setEmp]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)
  const navigate=useNavigate()
  
  const submit=async e=>{
    e.preventDefault()
    setErr('')
    setLoading(true)
    
    try{
      await login(emp,pass)
      navigate('/dashboard')
    }catch(ex){
      setErr(ex.message || 'Login failed')
    }finally{
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={80} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ECS Receipt Portal</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>
        
        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employee Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200" 
                  value={emp} 
                  onChange={e=>setEmp(e.target.value)}
                  placeholder="e.g., ADMIN or ECS497"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200" 
                  value={pass} 
                  onChange={e=>setPass(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <FiAlertCircle className="h-5 w-5 mr-2" />
                {err}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <FiLogIn className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
          
          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Demo Credentials:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Admin:</span>
                <div className="text-gray-900 font-mono">
                  <span className="text-red-600">ADMIN</span> / admin123
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Employee:</span>
                <div className="text-gray-900 font-mono">
                  <span className="text-red-600">ECS497</span> / pass123
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; 2024 ECS Financial Services. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
