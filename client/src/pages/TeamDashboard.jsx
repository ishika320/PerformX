import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TeamDashboard(){
  const [team, setTeam] = useState([])
  const [teamGoals, setTeamGoals] = useState([])
  const [profile, setProfile] = useState(null)
  const [title, setTitle] = useState('')
  const [thrustArea, setThrustArea] = useState('')
  const [uom, setUom] = useState('Numeric')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [weightage, setWeightage] = useState(10)
  const [quarter, setQuarter] = useState('Q1')
  const [message, setMessage] = useState('')
  const [feedbacks, setFeedbacks] = useState({})
  const [feedbackHistory, setFeedbackHistory] = useState({})

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(p)
    if(p?.department){
      const { data } = await supabase.from('profiles').select('id,name').eq('department', p.department)
      setTeam((data || []).filter(d=> d.id !== user.id))
      // load goals for team members
      const ids = (data || []).map(d=> d.id)
      if(ids.length){
        const { data: g } = await supabase.from('goals').select('*, profiles(name)').in('employee_id', ids).order('created_at', { ascending: false })
        setTeamGoals(g || [])
        // load feedbacks for these goals
        const gids = (g || []).map(x=> x.id)
        if(gids.length){
          const { data: f } = await supabase.from('feedback_logs').select('*').in('goal_id', gids).order('created_at', { ascending: false })
          const hist = {}
          const authorIds = new Set()
          (f || []).forEach(r=>{ hist[r.goal_id] = hist[r.goal_id] || []; hist[r.goal_id].push(r); if(r.author_id) authorIds.add(r.author_id) })
          if(authorIds.size){
            const { data: authors } = await supabase.from('profiles').select('id,name,role').in('id', Array.from(authorIds))
            const nameMap = {}
            const roleMap = {}
            (authors || []).forEach(a=> { nameMap[a.id] = a.name; roleMap[a.id] = a.role })
            Object.keys(hist).forEach(gid => {
              hist[gid] = hist[gid].map(entry => ({ ...entry, author_name: nameMap[entry.author_id] || entry.author_id, author_role: roleMap[entry.author_id] || null }))
            })
          }
          setFeedbackHistory(hist)
        } else {
          setFeedbackHistory({})
        }
      } else {
        setTeamGoals([])
      }
    }
  }

  useEffect(()=>{ load() },[])

  async function createShared(){
    setMessage('')
    if(!profile) return setMessage('Please login')
    if(!title) return setMessage('Title required')
    // insert shared goal
    const { data: sg, error: sgErr } = await supabase.from('shared_goals').insert([{ title, thrust_area: thrustArea, uom, target_value: targetValue, owner_id: profile.id, department: profile.department }]).select().single()
    if(sgErr){ console.error('Shared goal create failed', sgErr); setMessage('Create failed'); return }

    // create member links for each team member (including owner if desired)
    const members = [ ...team.map(t=>t.id) ]
    // optionally include owner as primary owner goal
    members.push(profile.id)
    const inserts = members.map(m => ({ shared_goal_id: sg.id, employee_id: m }))
    const { error: memErr } = await supabase.from('shared_goal_members').insert(inserts)
    if(memErr){ console.error('Shared member insert failed', memErr); }

    // create goals for members (draft so they can adjust weightage)
    const goalRows = members.map(mid => ({ employee_id: mid, title, description: 'Shared goal', weightage, quarter, thrust_area: thrustArea, uom, target_value: targetValue, is_shared: true, shared_group_id: sg.id, status: 'draft' }))
    const { error: gErr } = await supabase.from('goals').insert(goalRows)
    if(gErr){ console.error('Insert shared goals failed', gErr); setMessage('Failed to create goals for members'); return }

    setMessage('Shared goal created and pushed to team')
    // notify team (insert notifications)
    for(const mid of members){
      await supabase.from('notifications').insert({ user_id: mid, type: 'shared_goal', message: `A shared goal was assigned: ${title}`, data: { sharedGoalId: sg.id } })
    }
    load()
  }

  async function decide(goalId, decision){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return

    if(decision === 'approve'){
      const upd = await supabase.from('goals').update({ status: 'approved', locked: true }).eq('id', goalId)
      if(upd.error){ console.error('Approve failed', upd); return }
    } else if(decision === 'return'){
      const upd = await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId)
      if(upd.error){ console.error('Return failed', upd); return }
    } else {
      const upd = await supabase.from('goals').update({ status: 'rejected' }).eq('id', goalId)
      if(upd.error){ console.error('Reject failed', upd); return }
    }

    const a = await supabase.from('approvals').insert({ goal_id: goalId, manager_id: user.id, decision, timestamp: new Date() })
    if(a.error){ console.error('Approval insert failed', a); }
    await supabase.from('audit_logs').insert({ user_id: user.id, action: decision === 'approve' ? 'approve_goal' : (decision === 'return' ? 'return_goal' : 'reject_goal'), module: 'team-dashboard', metadata: { goalId } })
    // notify goal owner
    const g = teamGoals.find(tg=> tg.id === goalId)
    if(g){ await supabase.from('notifications').insert({ user_id: g.employee_id, type: 'approval', message: `Your goal "${g.title}" was ${decision} by ${user.email || user.id}`, data: { goalId, decision } }) }
    // save feedback if present
    const comment = feedbacks[goalId]
    if(comment){
      const f = await supabase.from('feedback_logs').insert({ goal_id: goalId, author_id: user.id, author_role: 'manager', context: 'team', comment })
      if(f.error) console.error('Feedback insert failed', f)
    }
    setMessage('Action applied')
    load()
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Team Dashboard</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-600">Manager view: push a departmental KPI to your team members.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Shared Goal Title" className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input value={thrustArea} onChange={e=>setThrustArea(e.target.value)} placeholder="Thrust Area" className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <select value={uom} onChange={e=>setUom(e.target.value)} className="p-3 border rounded-lg">
              <option>Numeric</option>
              <option>%</option>
              <option>Timeline</option>
              <option>Zero</option>
            </select>
            <input value={targetValue} onChange={e=>setTargetValue(e.target.value)} placeholder="Target value" className="p-3 border rounded-lg" />
            <input value={weightage} onChange={e=>setWeightage(Number(e.target.value))} type="number" className="p-3 border rounded-lg" />
            <select value={quarter} onChange={e=>setQuarter(e.target.value)} className="p-3 border rounded-lg">
              <option>Q1</option>
              <option>Q2</option>
              <option>Q3</option>
              <option>Q4</option>
            </select>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" className="p-3 border rounded-lg md:col-span-3" rows={2} />
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Team Goals</h3>
            <div className="space-y-3 mt-3">
              {teamGoals.map(g=> (
                <div key={g.id} className="p-3 card flex flex-col md:flex-row items-start md:items-center justify-between">
                  <div>
                    <div className="font-semibold">{g.title} <span className="text-sm text-slate-400">by {g.profiles?.name || g.employee_id}</span></div>
                    <div className="text-sm text-slate-600">{g.description}</div>
                    <div className="text-sm text-slate-500">Status: {g.status} • Weight: {g.weightage}% • UoM: {g.uom}</div>
                  </div>
                  <div className="mt-3 md:mt-0 md:ml-6 flex-1">
                    <div className="flex gap-2 mb-2">
                      <button onClick={()=>decide(g.id,'approve')} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                      <button onClick={()=>decide(g.id,'return')} className="px-3 py-1 bg-amber-400 text-white rounded">Return</button>
                      <button onClick={()=>decide(g.id,'reject')} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                    </div>
                    <textarea value={feedbacks[g.id] || ''} onChange={e=>setFeedbacks(f=>({ ...f, [g.id]: e.target.value }))} placeholder="Add feedback for this goal" className="w-full p-2 border rounded-lg" rows={2} />
                    {/* feedback history */}
                    {(feedbackHistory[g.id] || []).map(fb=> (
                      <div key={fb.id} className="mt-2 text-sm text-slate-600">
                        <div className="font-medium">{fb.author_name || fb.author_id}{fb.author_role ? ` (${fb.author_role})` : ''} <span className="text-xs text-slate-400">{new Date(fb.created_at).toLocaleString()}</span></div>
                        <div>{fb.comment}</div>
                      </div>
                    ))}
                    {g.locked && <div className="text-sm text-green-600 mt-2">Locked</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={createShared} className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg">Create & Push to Team</button>
            {message && <div className="text-sm text-slate-600">{message}</div>}
          </div>

        </div>
      </div>
    </div>
  )
}
