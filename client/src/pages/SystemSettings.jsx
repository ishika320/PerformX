import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SystemSettings(){
  const [cycles, setCycles] = useState([])
  const [form, setForm] = useState({ name: '', cycle_type: 'checkin', quarter: 'Q1', start_date: '', end_date: '' })
  const [editing, setEditing] = useState(null)

  async function load(){
    const { data } = await supabase.from('cycles').select('*').order('start_date', { ascending: true })
    setCycles(data || [])
  }

  useEffect(()=>{ load() },[])

  function setField(k,v){ setForm(f=>({ ...f, [k]: v })) }

  async function save(){
    if(editing){
      const { error } = await supabase.from('cycles').update(form).eq('id', editing)
      if(error){ alert('Failed to update'); console.error(error); return }
      setEditing(null)
    }else{
      const { error } = await supabase.from('cycles').insert(form)
      if(error){ alert('Failed to create'); console.error(error); return }
    }
    setForm({ name: '', cycle_type: 'checkin', quarter: 'Q1', start_date: '', end_date: '' })
    load()
  }

  async function remove(id){
    if(!confirm('Delete this cycle?')) return
    const { error } = await supabase.from('cycles').delete().eq('id', id)
    if(error){ alert('Failed to delete'); console.error(error); return }
    load()
  }

  function edit(c){ setEditing(c.id); setForm({ name: c.name, cycle_type: c.cycle_type, quarter: c.quarter, start_date: c.start_date?.slice(0,19), end_date: c.end_date?.slice(0,19) }) }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">System Settings</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600">Configure system-wide preferences and integrations.</p>

          <hr className="my-4" />
          <h3 className="font-semibold mb-2">Cycles (Check-in windows)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input placeholder="Name" value={form.name} onChange={e=>setField('name', e.target.value)} className="p-2 border rounded" />
            <select value={form.quarter} onChange={e=>setField('quarter', e.target.value)} className="p-2 border rounded">
              <option>Q1</option>
              <option>Q2</option>
              <option>Q3</option>
              <option>Q4</option>
            </select>
            <select value={form.cycle_type} onChange={e=>setField('cycle_type', e.target.value)} className="p-2 border rounded">
              <option value="checkin">checkin</option>
              <option value="goal_window">goal_window</option>
            </select>
            <input type="datetime-local" value={form.start_date} onChange={e=>setField('start_date', e.target.value)} className="p-2 border rounded" />
            <input type="datetime-local" value={form.end_date} onChange={e=>setField('end_date', e.target.value)} className="p-2 border rounded" />
            <div className="flex gap-2">
              <button onClick={save} className="px-3 py-1 bg-primary-500 text-white rounded">{editing ? 'Update' : 'Create'}</button>
              {editing && <button onClick={()=>{ setEditing(null); setForm({ name: '', cycle_type: 'checkin', quarter: 'Q1', start_date: '', end_date: '' }) }} className="px-3 py-1 border rounded">Cancel</button>}
            </div>
          </div>

          <div className="space-y-2">
            {cycles.map(c=> (
              <div key={c.id} className="p-3 card flex items-center justify-between">
                <div>
                  <div className="font-semibold">{c.name} <span className="text-sm text-slate-400">({c.cycle_type} • {c.quarter})</span></div>
                  <div className="text-sm text-slate-600">{new Date(c.start_date).toLocaleString()} → {new Date(c.end_date).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>edit(c)} className="px-2 py-1 border rounded">Edit</button>
                  <button onClick={()=>remove(c.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
