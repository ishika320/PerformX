import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isCheckinOpen } from '../lib/constants'

export default function Checkins(){
  const [goals, setGoals] = useState([])
  const [values, setValues] = useState({})
  const [statuses, setStatuses] = useState({})
  const [comment, setComment] = useState('')
  const [quarter, setQuarter] = useState('Q1')
  const [isOpen, setIsOpen] = useState(true)

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    const { data } = await supabase.from('goals').select('*').eq('employee_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
    setIsOpen(isCheckinOpen(quarter))
  }

  useEffect(()=>{ load() },[])

  function handleChange(id, val){ setValues(v=>({ ...v, [id]: val })) }
  function handleStatus(id, val){ setStatuses(s => ({ ...s, [id]: val })) }

  async function submitCheckin(goalId){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return alert('Please login')
    const actual = Number(values[goalId] || 0)
    // quick client-side check for quarter window
    if(!isCheckinOpen(quarter)){
      return alert(`Check-ins for ${quarter} are currently closed (client-side check).`)
    }
    // server-side RPC still used as authoritative guard
    const { data: canSubmit, error: rpcErr } = await supabase.rpc('can_submit_checkin', { p_quarter: quarter })
    if(rpcErr){ console.error('RPC error', rpcErr); alert('Unable to verify check-in window'); return }
    if(!canSubmit){ return alert(`Check-ins for ${quarter} are closed.`) }

    const statusFor = statuses[goalId] || 'Not Started'
    const { error } = await supabase.from('checkins').insert({ goal_id: goalId, employee_id: user.id, quarter, actual_value: actual, status: statusFor, comment })
    if(error){ console.error('Checkin insert failed', error); alert('Failed to save'); return }
    alert('Check-in saved')
    try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}
    load()
  }


  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Quarterly Check-ins</h2>
      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm">Quarter</label>
        <select value={quarter} onChange={e=>setQuarter(e.target.value)} className="p-2 border rounded">
          <option>Q1</option>
          <option>Q2</option>
          <option>Q3</option>
          <option>Q4</option>
        </select>
        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Check-in comment" className="p-2 border rounded ml-4 flex-1" />
      </div>
      {!isCheckinOpen(quarter) && (
        <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-300 text-amber-700 rounded">Check-ins for {quarter} are currently closed. You cannot submit actuals until the window opens.</div>
      )}

      <div className="space-y-3">
        {goals.map(g=> (
          <div key={g.id} className="p-4 card flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">{g.title} <span className="text-sm text-slate-400">({g.quarter})</span></div>
              <div className="text-sm text-slate-600">Target: {g.target_value} • UoM: {g.uom} • Current Progress: {g.progress}%</div>
            </div>
            <div className="w-64 flex items-center gap-2">
              <input value={values[g.id] || ''} onChange={e=>handleChange(g.id, e.target.value)} placeholder="Actual" className="p-2 border rounded w-24" disabled={!isCheckinOpen(quarter)} />
              <select value={statuses[g.id] || 'Not Started'} onChange={e=>handleStatus(g.id, e.target.value)} className="p-2 border rounded" disabled={!isCheckinOpen(quarter)}>
                <option>Not Started</option>
                <option>On Track</option>
                <option>Completed</option>
              </select>
              <button onClick={()=>submitCheckin(g.id)} className="px-3 py-1 bg-primary-500 text-white rounded" disabled={!isCheckinOpen(quarter)}>Save</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
