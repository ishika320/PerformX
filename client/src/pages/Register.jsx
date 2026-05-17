import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [error, setError] = useState(null)
  const nav = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if(error) return setError(error.message)
    // create profile
    await supabase.from('profiles').upsert({ id: data.user.id, name, role })
    // redirect based on selected role
    if(role === 'employee') nav('/goals')
    else if(role === 'manager') nav('/dashboard')
    else if(role === 'admin') nav('/settings')
    else nav('/')
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Register</h2>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full p-2 border rounded" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full p-2 border rounded" />
        <select value={role} onChange={e=>setRole(e.target.value)} className="w-full p-2 border rounded">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button className="w-full bg-indigo-600 text-white p-2 rounded">Create account</button>
      </form>
    </div>
  )
}
