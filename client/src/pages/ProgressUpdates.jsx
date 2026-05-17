import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProgressUpdates(){
  const [teamGoals, setTeamGoals] = useState([])
  const [comment, setComment] = useState('')

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    // load team members' goals where manager_id = user.id
    const { data: team } = await supabase.from('profiles').select('id').eq('manager_id', user.id)
    const ids = (team || []).map(t=>t.id)
    if(ids.length === 0){ setTeamGoals([]); return }
    const { data } = await supabase.from('goals').select('*, checkins(*)').in('employee_id', ids).order('created_at', { ascending: false })
    setTeamGoals(data || [])
  }

  useEffect(()=>{ load() },[])

  async function addComment(goalId){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return alert('Please login')
    const { error } = await supabase.from('checkin_comments').insert({ goal_id: goalId, manager_id: user.id, comment })
    if(error){ console.error('Add comment failed', error); alert('Failed to add comment'); return }
    setComment('')
    load()
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Manager Check-in Review</h2>
      <div className="space-y-3">
        {teamGoals.map(g=> (
          <div key={g.id} className="p-4 card">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{g.title} <span className="text-sm text-slate-400">({g.employee_id})</span></div>
                <div className="text-sm text-slate-600">Target: {g.target_value} • UoM: {g.uom} • Progress: {g.progress}%</div>
              </div>
              <div className="text-sm text-slate-500">Status: {g.status}</div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-medium">Check-ins:</div>
              <div className="mt-2 space-y-2">
                {(g.checkins || []).map(c => (
                  <div key={c.id} className="p-2 border rounded">
                    <div className="text-sm">Actual: {c.actual_value} • Quarter: {c.quarter} • {new Date(c.created_at).toLocaleString()}</div>
                    <div className="text-sm">Comment: {c.comment}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add check-in comment" className="w-full p-2 border rounded" />
              <div className="mt-2 text-right">
                <button onClick={()=>addComment(g.id)} className="px-3 py-1 bg-primary-500 text-white rounded">Add Comment</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
