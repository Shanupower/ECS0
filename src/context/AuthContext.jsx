import React,{createContext,useContext,useState,useEffect} from 'react'
import { api } from '../api'

const AuthCtx=createContext(null)
export function AuthProvider({children}){
  const [token,setToken]=useState(localStorage.getItem('ecs_token')||'')
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ecs_user')||'null')}catch{return null}})
  useEffect(()=>{
    if(token) localStorage.setItem('ecs_token',token); else localStorage.removeItem('ecs_token')
    if(user) localStorage.setItem('ecs_user',JSON.stringify(user)); else localStorage.removeItem('ecs_user')
  },[token,user])
  const login=async(c,p)=>{
    const out=await api.login(c,p)
    setToken(out.token)
    // Fetch user profile after login
    try {
      const userProfile = await api.me(out.token)
      setUser(userProfile)
    } catch (error) {
      // If /api/users/me doesn't exist, try /api/auth/profile
      try {
        const userProfile = await api.req('/api/auth/profile', { token: out.token })
        setUser(userProfile.user || userProfile)
      } catch (profileError) {
        console.error('Failed to fetch user profile:', profileError)
        // Set basic user info from login response if available
        setUser({ emp_code: c, role: 'employee' })
      }
    }
  }

  const branchLogin=async(branchName,p)=>{
    const out=await api.branchLogin(branchName,p)
    setToken(out.token)
    // Set user info from branch login response
    setUser(out.user)
    // Store branch info if available
    if(out.branch){
      localStorage.setItem('branchInfo', JSON.stringify(out.branch))
    }
  }
  const logout=()=>{setToken('');setUser(null)}
  return <AuthCtx.Provider value={{token,user,login,branchLogin,logout}}>{children}</AuthCtx.Provider>
}
export const useAuth=()=>useContext(AuthCtx)
