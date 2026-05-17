import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function GoalForm({ onSaved, existingGoals = [], profile }){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [weightage, setWeightage] = useState(10)
  const [quarter, setQuarter] = useState('Q1')
  const [thrustArea, setThrustArea] = useState('')
  const [uom, setUom] = useState('Numeric')
  const [target, setTarget] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log(user);

    // Create/update profile first
    const profileRes = await supabase
      .from("profiles")
      .upsert([
        {
          id: user.id,
          name: user.email,
          role: "employee",
          department: "Engineering",
        },
      ]);

    console.log("Profile Result:", profileRes);

    // Create goal
    const goalRes = await supabase
      .from("goals")
      .insert([
        {
          employee_id: user.id,
          title,
          description,
          thrust_area: thrustArea,
          uom,
          target_value: target,
          weightage,
          quarter,
        },
      ]);

    console.log("Goal Result:", goalRes);

    if (goalRes.error) {
      console.log("Create goal error", goalRes.error);
      setError(goalRes.error.message || 'Failed to create goal')
    } else {
      console.log("Goal created successfully");
      setTitle(''); setDescription(''); setWeightage(10)
      setThrustArea(''); setUom('%'); setTarget('')
      try{ window.dispatchEvent(new Event('goals:changed')) }catch(e){}
      if(onSaved) onSaved()
    }
  };

  async function handleAISuggest(){
    try{
      const res = await fetch((import.meta.env.VITE_AI_URL || 'http://localhost:7070') + '/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: profile?.role, department: profile?.department })
      })
      const json = await res.json()
      if(json.ok && json.suggestions && json.suggestions.length){
        const s = json.suggestions[0]
        setTitle(s.title || '')
        setDescription(s.description || '')
        setWeightage(s.weightage || 10)
        setQuarter(s.quarter || 'Q2')
      }else{
        setError('No suggestions available')
      }
    }catch(err){
      console.error('AI suggestion error', err)
      setError('AI suggestion failed')
    }
  }

  const existingTotal = existingGoals.reduce((s,g)=> s + Number(g.weightage || 0), 0)
  const totalAfter = existingTotal + Number(weightage || 0)
  const submitDisabled = !title || Number(weightage) < 10 || existingGoals.length >= 8 || totalAfter > 100

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header mb-4">
        <h3 className="font-semibold text-lg">Create Goal</h3>
      </div>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-sm text-slate-600">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="mt-1 p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500" required />
        </div>
        <div>
          <label className="text-sm text-slate-600">Thrust Area</label>
          <input value={thrustArea} onChange={e=>setThrustArea(e.target.value)} placeholder="Thrust Area (e.g., Sales, Ops)" className="mt-1 p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="text-sm text-slate-600">Description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" className="mt-1 p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500" rows={4} />
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-sm text-slate-600">Weightage %</label>
            <input type="number" value={weightage} onChange={e=>setWeightage(Number(e.target.value))} className="mt-1 p-2 border rounded-lg w-28" />
          </div>
          <div>
            <label className="text-sm text-slate-600">UoM</label>
            <select value={uom} onChange={e=>setUom(e.target.value)} className="mt-1 p-2 border rounded-lg">
              <option>Numeric</option>
              <option>%</option>
              <option>Timeline</option>
              <option>Zero</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Target</label>
            <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Target" className="mt-1 p-2 border rounded-lg w-32" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Quarter</label>
            <select value={quarter} onChange={e=>setQuarter(e.target.value)} className="mt-1 p-2 border rounded-lg">
              <option>Q1</option>
              <option>Q2</option>
              <option>Q3</option>
              <option>Q4</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={handleAISuggest} className="px-3 py-1 bg-emerald-500 text-white rounded-lg">AI Suggest</button>
            <button type="submit" disabled={submitDisabled} className={`px-4 py-2 text-white rounded-lg ${submitDisabled ? 'bg-slate-300' : 'bg-gradient-to-r from-primary-500 to-accent-500'}`}>Create</button>
          </div>
        </div>

        <div className="text-sm text-slate-600">Goals: {existingGoals.length} / 8 • Current total weight: {existingTotal}% • After create: {totalAfter}%</div>
      </div>
    </form>
  )
}
