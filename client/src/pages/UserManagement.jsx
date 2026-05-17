import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserManagement(){
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', role: 'employee', department: '', manager_id: '' })
  const [inviteEmail, setInviteEmail] = useState('')

  async function load(){
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if(error){ console.error(error); return }
    setUsers(data || [])
  }

  useEffect(()=>{ load() },[])

  function setField(k,v){ setForm(f=>({ ...f, [k]: v })) }

  function startEdit(u){ setEditing(u.id); setForm({ name: u.name||'', role: u.role||'employee', department: u.department||'', manager_id: u.manager_id||'' }) }

  async function save(){
    if(editing){
      const { error } = await supabase.from('profiles').update(form).eq('id', editing)
      if(error){ alert('Failed to update'); console.error(error); return }
      setEditing(null)
    }else{
      // create stub profile (user auth should exist separately)
      const { error } = await supabase.from('profiles').insert({ id: form.id, name: form.name, role: form.role, department: form.department, manager_id: form.manager_id })
      if(error){ alert('Failed to create'); console.error(error); return }
    }
    setForm({ name: '', role: 'employee', department: '', manager_id: '' })
    load()
  }

  async function invite(){
    if(!inviteEmail) return alert('Enter email to invite')
    const { data, error } = await supabase.auth.signUp({ email: inviteEmail }, { data: { role: form.role, department: form.department, manager_id: form.manager_id } })
    if(error){ console.error('Invite failed', error); alert('Invite failed: ' + error.message); return }
    alert('Invitation sent (check email)')
    // log audit
    try{ await supabase.from('audit_logs').insert({ user_id: null, action: 'invite_sent', module: 'user_mgmt', metadata: { email: inviteEmail } }) }catch(e){ console.warn('Audit failed', e) }
    setInviteEmail('')
  }

  const [adminKeyInput, setAdminKeyInput] = useState('')
  const [serverEmail, setServerEmail] = useState('')
  const [serverPassword, setServerPassword] = useState('')

  async function createViaServer(){
    if(!serverEmail) return alert('Enter email')
    if(!adminKeyInput) return alert('Enter Admin API Key to login')
    const base = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:7071')
    try{
      // exchange admin key for short-lived token
      const authRes = await fetch(base + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_key: adminKeyInput }) })
      const authJson = await authRes.json()
      if(!authRes.ok) return alert('Login failed: ' + (authJson.error || JSON.stringify(authJson)))
      const token = authJson.token

      const resp = await fetch(base + '/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ email: serverEmail, password: serverPassword, role: form.role, name: form.name, department: form.department, manager_id: form.manager_id })
      })
      const json = await resp.json()
      if(!resp.ok) return alert('Create failed: ' + (json.error || JSON.stringify(json)))
      alert('User created: ' + json.user.email)
      load()
    }catch(err){ console.error('Server create failed', err); alert('Server create failed') }
  }

  async function remove(id){
    if(!confirm('Delete user? This will remove the profile but not auth.')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if(error){ alert('Failed to delete'); console.error(error); return }
    load()
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">User Management</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600">Admin area: manage users, roles, and permissions.</p>

          <div className="my-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="Name" value={form.name} onChange={e=>setField('name', e.target.value)} className="p-2 border rounded" />
            <select value={form.role} onChange={e=>setField('role', e.target.value)} className="p-2 border rounded">
              <option value="employee">employee</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
            <input placeholder="Department" value={form.department} onChange={e=>setField('department', e.target.value)} className="p-2 border rounded" />
            <input placeholder="Manager ID" value={form.manager_id} onChange={e=>setField('manager_id', e.target.value)} className="p-2 border rounded" />
          </div>
          <div className="mb-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <input placeholder="Invite by email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} className="p-2 border rounded md:col-span-2" />
            <button onClick={invite} className="px-3 py-2 bg-primary-500 text-white rounded">Send Invite</button>
          </div>
          <div className="mb-6 border-t pt-4">
            <h4 className="font-semibold mb-2">Admin: Create user (server)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input placeholder="Admin API Key" value={adminKeyInput} onChange={e=>setAdminKeyInput(e.target.value)} className="p-2 border rounded" />
              <input placeholder="Password (optional)" value={serverPassword} onChange={e=>setServerPassword(e.target.value)} className="p-2 border rounded" />
              <input placeholder="Server API URL (optional)" value={(import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:7071') } disabled className="p-2 border rounded bg-slate-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <input placeholder="Email to create" value={serverEmail} onChange={e=>setServerEmail(e.target.value)} className="p-2 border rounded md:col-span-2" />
              <button onClick={createViaServer} className="px-3 py-2 bg-indigo-600 text-white rounded">Create via Server</button>
            </div>
          </div>
          <div className="mb-4">
            <button onClick={save} className="px-3 py-1 bg-primary-500 text-white rounded">{editing ? 'Update' : 'Create'}</button>
            {editing && <button onClick={()=>{ setEditing(null); setForm({ name: '', role: 'employee', department: '', manager_id: '' }) }} className="ml-2 px-3 py-1 border rounded">Cancel</button>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-slate-600">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Manager</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u=> (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 text-sm">{u.name}</td>
                    <td className="py-2 text-sm">{u.role}</td>
                    <td className="py-2 text-sm">{u.department}</td>
                    <td className="py-2 text-sm">{u.manager_id}</td>
                    <td className="py-2 text-sm">
                      <button onClick={()=>startEdit(u)} className="px-2 py-1 border rounded mr-2">Edit</button>
                      <button onClick={()=>remove(u.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
