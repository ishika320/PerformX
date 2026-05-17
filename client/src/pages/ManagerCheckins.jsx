import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentQuarter } from '../lib/constants'

export default function ManagerCheckins(){
  const [profile, setProfile] = useState(null)
  const [team, setTeam] = useState([])
  const [goals, setGoals] = useState([])
  const [comments, setComments] = useState({})

  async function load(){
    const ures = await supabase.auth.getUser()
    const user = ures.data.user
    if(!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(p)
    if(!p?.department) return
    const { data: members } = await supabase.from('profiles').select('id,name').eq('department', p.department)
    const memberIds = (members || []).map(m=> m.id)
    setTeam(members || [])
    if(memberIds.length){
      const q = getCurrentQuarter()
      const { data: g } = await supabase.from('goals').select('*, checkins(actual_value,quarter,created_at)').in('employee_id', memberIds).eq('quarter', q).order('created_at', { ascending: false })
      setGoals(g || [])
    }
  }

  useEffect(()=>{ load() },[])

  async function saveComment(goalId){
    const userRes = await supabase.auth.getUser(); const user = userRes.data.user
    if(!user) return alert('Please login')
    const comment = comments[goalId]
    if(!comment) return alert('Enter a comment')
    const { error } = await supabase.from('checkin_comments').insert({ goal_id: goalId, manager_id: user.id, comment })
    if(error){ console.error('Save comment failed', error); return alert('Failed to save') }
    alert('Comment saved')
    setComments(c=>({ ...c, [goalId]: '' }))
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Manager Check-ins</h2>
      <p className="text-slate-600 mb-4">Quarter: {getCurrentQuarter()}</p>
      <div className="space-y-4">
        {goals.map(g=> (
          <div key={g.id} className="p-4 card flex flex-col md:flex-row justify-between">
            <div>
              <div className="font-semibold">{g.title} <span className="text-sm text-slate-400">by {g.employee_id}</span></div>
              <div className="text-sm text-slate-600">Target: {g.target_value} • UoM: {g.uom}</div>
              <div className="text-sm text-slate-500">Latest actual: {(g.checkins && g.checkins[0]) ? g.checkins[0].actual_value : '—' } • Progress: {g.progress}%</div>
            </div>
            <div className="md:w-1/3 mt-3 md:mt-0">
              <textarea value={comments[g.id] || ''} onChange={e=>setComments(c=>({ ...c, [g.id]: e.target.value }))} placeholder="Add check-in comment" className="w-full p-2 border rounded" rows={3} />
              <div className="mt-2"><button onClick={()=>saveComment(g.id)} className="px-3 py-1 bg-primary-500 text-white rounded">Save Comment</button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
