import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Approvals(){
  const [submitted, setSubmitted] = useState([])
  const [edits, setEdits] = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [feedbackHistory, setFeedbackHistory] = useState({})

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    // manager sees goals submitted by team members where profiles.manager_id = user.id
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const isAdmin = p?.role === 'admin'
    let query = supabase.from('goals').select('*, profiles(*)').eq('status', 'submitted')
    if(!isAdmin){
      query = query.eq('profiles.manager_id', user.id)
    }
    const { data } = await query
    setSubmitted(data || [])
    // initialise edits
    const map = {}
    ;(data || []).forEach(g=>{
      map[g.id] = { title: g.title, description: g.description, weightage: g.weightage, thrust_area: g.thrust_area, uom: g.uom, target_value: g.target_value }
    })
    setEdits(map)
    // load feedbacks for these submitted goals
    const ids = (data || []).map(g=> g.id)
    if(ids.length){
      const { data: f } = await supabase.from('feedback_logs').select('*').in('goal_id', ids).order('created_at', { ascending: false })
      const hist = {}
      const authorIds = new Set()
      (f || []).forEach(r=>{ hist[r.goal_id] = hist[r.goal_id] || []; hist[r.goal_id].push(r); if(r.author_id) authorIds.add(r.author_id) })
      // fetch author names
      if(authorIds.size){
        const { data: authors } = await supabase.from('profiles').select('id,name,role').in('id', Array.from(authorIds))
        const nameMap = {}
        const roleMap = {}
        (authors || []).forEach(a=> { nameMap[a.id] = a.name; roleMap[a.id] = a.role })
        // attach author_name and author_role
        Object.keys(hist).forEach(gid => {
          hist[gid] = hist[gid].map(entry => ({ ...entry, author_name: nameMap[entry.author_id] || entry.author_id, author_role: roleMap[entry.author_id] || null }))
        })
      }
      setFeedbackHistory(hist)
    } else {
      setFeedbackHistory({})
    }
  }

  useEffect(()=>{ load() },[])

  function startEdit(id){ setEdits(e=>({ ...e, [id]: { ...e[id] } })) }
  function changeEdit(id, key, value){ setEdits(e=>({ ...e, [id]: { ...e[id], [key]: value } })) }

  function changeFeedback(id, text){ setFeedbacks(f=>({ ...f, [id]: text })) }

  async function decide(goalId, decision){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return

    // if approving, apply any inline edits to the goal and lock it
    if(decision === 'approve'){
      const edit = edits[goalId] || {}
      const updGoal = await supabase.from('goals').update({
        title: edit.title,
        description: edit.description,
        weightage: edit.weightage,
        thrust_area: edit.thrust_area,
        uom: edit.uom,
        target_value: edit.target_value,
        status: 'approved',
        locked: true
      }).eq('id', goalId)
      if(updGoal.error){ console.error('Goal update failed', updGoal); return }
    } else if(decision === 'return'){
      // return for rework: set status back to draft
      const upd = await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId)
      if(upd.error){ console.error('Return update failed', upd); return }
    } else {
      // reject
      const upd = await supabase.from('goals').update({ status: 'rejected' }).eq('id', goalId)
      if(upd.error){ console.error('Reject update failed', upd); return }
    }

    const a = await supabase.from('approvals').insert({ goal_id: goalId, manager_id: user.id, decision, timestamp: new Date() })
    if(a.error){ console.error('Approval insert failed', a); return }

    // save feedback if manager added comments
    const comment = feedbacks[goalId]
    if(comment){
      const f = await supabase.from('feedback_logs').insert({ goal_id: goalId, author_id: user.id, author_role: 'manager', context: 'approval', comment })
      if(f.error) console.error('Feedback insert failed', f)
    }

    const audit = await supabase.from('audit_logs').insert({ user_id: user.id, action: decision === 'approve' ? 'approve_goal' : (decision === 'return' ? 'return_goal' : 'reject_goal'), module: 'approvals', metadata: { goalId } })
    if(audit.error){ console.error('Audit insert failed', audit) }

    // notify and reload
    try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}
    load()
  }

  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Pending Approvals</h2>
      <div className="space-y-4">
        {submitted.map(s=> (
          <div key={s.id} className="p-4 card flex flex-col md:flex-row justify-between items-start">
            <div className="w-full md:w-3/4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{s.title} <span className="text-sm text-slate-400">by {s.profiles?.name || s.employee_id}</span></div>
                  <div className="text-sm text-slate-600">{s.description}</div>
                </div>
                <div className="ml-4">
                  {!s.locked && <button onClick={()=>startEdit(s.id)} className="px-2 py-1 bg-slate-100 rounded">Edit</button>}
                </div>
              </div>

              {edits[s.id] ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={edits[s.id].title || ''} onChange={e=>changeEdit(s.id,'title',e.target.value)} className="p-2 border rounded-lg" />
                  <input value={edits[s.id].thrust_area || ''} onChange={e=>changeEdit(s.id,'thrust_area',e.target.value)} className="p-2 border rounded-lg" placeholder="Thrust Area" />
                  <select value={edits[s.id].uom || ''} onChange={e=>changeEdit(s.id,'uom',e.target.value)} className="p-2 border rounded-lg">
                    <option>Numeric</option>
                    <option>%</option>
                    <option>Timeline</option>
                    <option>Zero</option>
                  </select>
                  <textarea value={edits[s.id].description || ''} onChange={e=>changeEdit(s.id,'description',e.target.value)} className="p-2 border rounded-lg md:col-span-2" rows={2} />
                  <input value={edits[s.id].target_value || ''} onChange={e=>changeEdit(s.id,'target_value',e.target.value)} className="p-2 border rounded-lg" placeholder="Target" />
                  <input type="number" value={edits[s.id].weightage || 0} onChange={e=>changeEdit(s.id,'weightage',Number(e.target.value))} className="p-2 border rounded-lg" />
                </div>
              ) : null}
              <div className="mt-3">
                <textarea value={feedbacks[s.id] || ''} onChange={e=>changeFeedback(s.id, e.target.value)} placeholder="Add feedback or comments" className="w-full p-2 border rounded-lg" rows={2} />
                <div className="mt-2 flex gap-2">
                  <button onClick={async ()=>{
                    const userRes = await supabase.auth.getUser(); const user = userRes.data.user; if(!user) return alert('Please login')
                    const { error } = await supabase.from('feedback_logs').insert({ goal_id: s.id, author_id: user.id, author_role: 'manager', context: 'comment', comment: feedbacks[s.id] })
                    if(error){ console.error('Feedback save failed', error); alert('Failed to save feedback') } else { alert('Feedback saved'); setFeedbacks(f=>({ ...f, [s.id]: '' })) }
                  }} className="px-3 py-1 bg-blue-600 text-white rounded">Save feedback</button>
                </div>
                {/* show existing feedback history */}
                {(feedbackHistory[s.id] || []).map(fb=> (
                  <div key={fb.id} className="mt-2 text-sm text-slate-600">
                    <div className="font-medium">{fb.author_name || fb.author_id}{fb.author_role ? ` (${fb.author_role})` : ''} <span className="text-xs text-slate-400">{new Date(fb.created_at).toLocaleString()}</span></div>
                    <div>{fb.comment}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 md:mt-0 md:ml-4 flex flex-col gap-2">
              <button onClick={()=>decide(s.id,'approve')} className="px-3 py-1 bg-green-600 text-white rounded-lg">Approve & Lock</button>
              <button onClick={()=>decide(s.id,'return')} className="px-3 py-1 bg-amber-400 text-white rounded-lg">Return for Rework</button>
              <button onClick={()=>decide(s.id,'reject')} className="px-3 py-1 bg-red-600 text-white rounded-lg">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
