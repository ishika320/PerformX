import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CompleteProfile(){
  const [name, setName] = useState('')
  const [role, setRole] = useState('employee')
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(()=>{
    let mounted = true
    async function init(){
      const { data: u } = await supabase.auth.getUser()
      const user = u?.data?.user ?? u?.user ?? null
      if(!user){ if(mounted) { setLoading(false); nav('/login') } ; return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if(!mounted) return
      if(p){ // already has profile -> redirect by role
        const r = p.role || 'employee'
        if(r === 'employee') nav('/goals')
        else if(r === 'manager') nav('/dashboard')
        else if(r === 'admin') nav('/settings')
        else nav('/')
        return
      }
      setLoading(false)
    }
    init()
    return ()=> mounted = false
  },[])

  async function save(){
    setLoading(true)
    const { data: u } = await supabase.auth.getUser()
    const user = u?.data?.user ?? u?.user ?? null
    if(!user) return nav('/login')
    const { error } = await supabase.from('profiles').upsert({ id: user.id, name, role })
    setLoading(false)
    if(error){ alert('Failed to save profile'); console.error(error); return }
    if(role === 'employee') nav('/goals')
    else if(role === 'manager') nav('/dashboard')
    else if(role === 'admin') nav('/settings')
    else nav('/')
  }

  if(loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Complete your profile</h2>
      <div className="space-y-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full p-2 border rounded" />
        <select value={role} onChange={e=>setRole(e.target.value)} className="w-full p-2 border rounded">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex justify-end">
          <button onClick={save} className="px-4 py-2 bg-primary-500 text-white rounded">Save profile</button>
        </div>
      </div>
    </div>
  )
}
