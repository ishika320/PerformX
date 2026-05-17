import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import GoalForm from '../components/GoalForm'

export default function Goals(){
  const [goals, setGoals] = useState([])
  const [profile, setProfile] = useState(null)
  const [errors, setErrors] = useState([])

  function validateGoals(gList){
    const errs = []
    if(!Array.isArray(gList)) return ['No goals found']
    const drafts = gList.filter(g => g.status === 'draft')
    if(drafts.length === 0) errs.push('No draft goals to submit')
    if(gList.length > 8) errs.push('Maximum 8 goals allowed')
    // check weightage sum across drafts (or all goals?) use all goals for employee
    const total = gList.reduce((s, g) => s + (Number(g.weightage) || 0), 0)
    if(total !== 100) errs.push(`Total weightage must equal 100% (current: ${total}%)`)
    // min per goal
    const low = gList.filter(g => (Number(g.weightage) || 0) < 10)
    if(low.length) errs.push('Each goal must have minimum 10% weightage')
    return errs
  }

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(p)
    // include shared_goal owner info to determine recipient vs owner
    const { data } = await supabase.from('goals').select('*, shared_goals(owner_id)').eq('employee_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
  }

  useEffect(()=>{ load() },[])

  useEffect(()=>{
    function handler(){ load() }
    window.addEventListener('goals:changed', handler)
    return () => window.removeEventListener('goals:changed', handler)
  },[])

  return (
    <div className="max-w-3xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">My Goals</h2>
      <div className="flex items-center justify-between gap-4">
        <GoalForm onSaved={load} existingGoals={goals} profile={profile} />
        <div className="ml-4">
          <button onClick={async ()=>{
            const userRes = await supabase.auth.getUser()
            const user = userRes.data.user
            if(!user) return alert('Please login')
            // validate locally before calling RPC
            const verrs = validateGoals(goals)
            if(verrs.length){ setErrors(verrs); return }
            setErrors([])
            const { data, error } = await supabase.rpc('submit_goals_for_employee', { p_employee_id: user.id })
            if(error){ console.error('Submit RPC failed', error); alert('Submit failed: ' + (error.message || JSON.stringify(error))); return }
            try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}
            load()
            alert('Goals submitted for approval')
          }} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Submit All Goals</button>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded">
          <div className="font-semibold text-rose-700">Validation errors</div>
          <ul className="list-disc list-inside text-sm text-rose-600">
            {errors.map((e,i)=> <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-6 space-y-3">
            {goals.map(g=> (
          <div key={g.id} className="p-4 card flex justify-between items-start transition-transform hover:-translate-y-1">
            <div>
                  <h3 className="font-semibold">{g.title} <span className="text-sm text-slate-400">({g.quarter})</span></h3>
              <p className="text-sm text-slate-600">{g.description}</p>
              <div className="text-sm text-slate-500 mt-2">Weight: {g.weightage}% • Status: {g.status}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {g.status === 'draft' && (
                  <div className="flex gap-2">
                  <button onClick={async ()=>{
                    const userRes = await supabase.auth.getUser()
                    const user = userRes.data.user
                    if(!user) return alert('Please login')
                    // validate before per-goal submit
                    const verrs = validateGoals(goals)
                    if(verrs.length){ setErrors(verrs); return }
                    setErrors([])
                    const { data, error } = await supabase.rpc('submit_goals_for_employee', { p_employee_id: user.id })
                    if(error){ console.error('Submit RPC failed', error); alert('Submit failed: ' + (error.message || JSON.stringify(error))); return }
                    try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}
                    load()
                  }} className="px-3 py-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded shadow hover:opacity-95 transition">Submit</button>
                </div>
              )}
              {g.is_shared && g.status === 'draft' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input type="number" min={10} max={100} defaultValue={g.weightage} onBlur={async (e)=>{
                      const val = Number(e.target.value)
                      if(isNaN(val) || val < 10){ alert('Minimum weight for a goal is 10%'); e.target.value = g.weightage; return }
                      if(val > 100){ alert('Weight cannot exceed 100%'); e.target.value = g.weightage; return }
                      const { error } = await supabase.from('goals').update({ weightage: val }).eq('id', g.id)
                      if(error){ console.error('Update weight failed', error); alert('Failed to update weight') } else { try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}; load() }
                    }} className="w-24 p-1 border rounded" />
                    <div className="text-sm text-slate-500">Adjust weight only (shared goal)</div>
                  </div>
                </div>
              )}
              {g.status === 'submitted' && <div className="text-sm text-amber-600">Pending approval</div>}
              {g.locked && <div className="text-sm text-green-600">Locked</div>}
            </div>
                {/* If this goal is from a shared template and current user is not the owner, show read-only title/target and allow only weight edits (handled above) */}
                {g.shared_goals && g.shared_goals[0] && profile && g.shared_goals[0].owner_id !== profile.id && (
                  <div className="w-full mt-3 text-sm text-slate-600">
                    <div>This goal is from a shared template by <strong>{g.shared_goals?.[0]?.owner_id}</strong> — title and target are read-only for recipients.</div>
                    <div className="text-xs text-slate-500 mt-1">If you need the title or target changed, request it from the owner or ask your manager to update the shared goal.</div>
                  </div>
                )}
          </div>
        ))}
      </div>
    </div>
  )
}
