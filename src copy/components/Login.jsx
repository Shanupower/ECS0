import React, { useState } from 'react'

const USER = 'admin'
const PASS = 'ecs@123' // change as needed

export default function Login({ onSuccess }){
  const [u,setU] = useState('')
  const [p,setP] = useState('')
  const [err,setErr] = useState('')

  const submit = (e)=>{
    e.preventDefault()
    if(u === USER && p === PASS){ onSuccess(); }
    else setErr('Invalid username or password')
  }

  return (
    <form onSubmit={submit}>
      <div className="center" style={{marginBottom:12}}>
        <h2 style={{margin:0}}>Login</h2>
        <div className="helper">Use <b>{USER}</b> / <b>{PASS}</b> (static)</div>
      </div>
      <div className="col">
        <label>Username</label>
        <input value={u} onChange={e=>setU(e.target.value)} placeholder="Enter username" />
      </div>
      <div className="col" style={{marginTop:10}}>
        <label>Password</label>
        <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Enter password" />
      </div>
      {err && <div className="helper" style={{color:'#b91c1c'}}>{err}</div>}
      <div className="actions" style={{marginTop:14}}>
        <button className="btn-primary" type="submit">Sign In</button>
      </div>
    </form>
  )
}
