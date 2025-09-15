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
    const userProfile = await api.me(out.token)
    setUser(userProfile)
  }
  const logout=()=>{setToken('');setUser(null)}
  return <AuthCtx.Provider value={{token,user,login,logout}}>{children}</AuthCtx.Provider>
}
export const useAuth=()=>useContext(AuthCtx)
