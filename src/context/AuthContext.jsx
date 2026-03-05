import React,{createContext,useContext,useState,useEffect} from 'react'
import { api, setTokenExpirationCallback } from '../api'

const AuthCtx=createContext(null)
export function AuthProvider({children}){
  const [token,setToken]=useState(localStorage.getItem('ecs_token')||'')
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ecs_user')||'null')}catch{return null}})
  const [isTokenExpired,setIsTokenExpired]=useState(false)
  const [impersonator,setImpersonator]=useState(()=>{try{return JSON.parse(localStorage.getItem('ecs_impersonator')||'null')}catch{return null}})
  useEffect(()=>{
    if(token) localStorage.setItem('ecs_token',token); else localStorage.removeItem('ecs_token')
    if(user) localStorage.setItem('ecs_user',JSON.stringify(user)); else localStorage.removeItem('ecs_user')
  if(impersonator) localStorage.setItem('ecs_impersonator',JSON.stringify(impersonator)); else localStorage.removeItem('ecs_impersonator')
  },[token,user,impersonator])

  // Fetch fresh profile when we have a token (e.g. after refresh) so must_change_password and profile are current
  useEffect(() => {
    if (!token) return
    let cancelled = false
    api.me(token).then((profile) => {
      if (!cancelled) setUser(profile)
    }).catch(() => { if (!cancelled) setUser(null) })
    return () => { cancelled = true }
  }, [token])
  
  // Set up token expiration callback
  useEffect(()=>{
    setTokenExpirationCallback(handleTokenExpiration)
  },[])
  const login=async(c,p)=>{
    const out=await api.login(c,p)
    setToken(out.token)
    setIsTokenExpired(false)
    setImpersonator(null)
    try {
      const userProfile = await api.me(out.token)
      setUser(userProfile)
    } catch (error) {
      try {
        const userProfile = await api.req('/api/auth/profile', { token: out.token })
        setUser(userProfile.user || userProfile)
      } catch (profileError) {
        console.error('Failed to fetch user profile:', profileError)
        setUser({ emp_code: c, role: 'employee' })
      }
    }
  }

  const refreshUser = async () => {
    if (!token) return
    try {
      const userProfile = await api.me(token)
      setUser(userProfile)
    } catch (e) {
      console.error('Failed to refresh user:', e)
    }
  }

  const logout=()=>{setToken('');setUser(null);setIsTokenExpired(false);setImpersonator(null);localStorage.removeItem('branchInfo')}

  const impersonateAs = async (empCode) => {
    if (!token || !user || user.role !== 'admin') {
      throw new Error('Only admins can impersonate users')
    }
    const trimmed = (empCode || '').trim()
    if (!trimmed) {
      throw new Error('Employee code is required')
    }
    const result = await api.impersonate(token, trimmed)
    if (!impersonator) {
      setImpersonator({ token, user })
    }
    setToken(result.token)
    setUser(result.user)
    setIsTokenExpired(false)
  }

  const endImpersonation = () => {
    if (!impersonator) return
    setToken(impersonator.token)
    setUser(impersonator.user)
    setImpersonator(null)
    setIsTokenExpired(false)
  }
  const handleTokenExpiration=()=>{setIsTokenExpired(true)}
  const clearTokenExpiration=()=>{setIsTokenExpired(false)}
  return <AuthCtx.Provider value={{token,user,login,logout,refreshUser,isTokenExpired,handleTokenExpiration,clearTokenExpiration,impersonator,impersonateAs,endImpersonation}}>{children}</AuthCtx.Provider>
}
export const useAuth=()=>useContext(AuthCtx)
