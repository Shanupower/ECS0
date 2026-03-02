import React,{createContext,useContext,useState,useEffect} from 'react'
import { api, setTokenExpirationCallback } from '../api'

const AuthCtx=createContext(null)
export function AuthProvider({children}){
  const [token,setToken]=useState(localStorage.getItem('ecs_token')||'')
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ecs_user')||'null')}catch{return null}})
  const [isTokenExpired,setIsTokenExpired]=useState(false)
  useEffect(()=>{
    if(token) localStorage.setItem('ecs_token',token); else localStorage.removeItem('ecs_token')
    if(user) localStorage.setItem('ecs_user',JSON.stringify(user)); else localStorage.removeItem('ecs_user')
  },[token,user])

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

  const logout=()=>{setToken('');setUser(null);setIsTokenExpired(false);localStorage.removeItem('branchInfo')}
  const handleTokenExpiration=()=>{setIsTokenExpired(true)}
  const clearTokenExpiration=()=>{setIsTokenExpired(false)}
  return <AuthCtx.Provider value={{token,user,login,logout,refreshUser,isTokenExpired,handleTokenExpiration,clearTokenExpiration}}>{children}</AuthCtx.Provider>
}
export const useAuth=()=>useContext(AuthCtx)
