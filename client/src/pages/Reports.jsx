import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Reports(){
  const [logs, setLogs] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [achievements, setAchievements] = useState([])

  async function load(){
    let q = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false })
    if(from) q = q.gte('timestamp', from)
    if(to) q = q.lte('timestamp', to)
    const { data, error } = await q
    if(error){ console.error('Failed to load logs', error); return }
    setLogs(data || [])
  }

  useEffect(()=>{ load() },[])

  async function loadAchievements(){
    // fetch goals with profile and checkins
    const { data, error } = await supabase.from('goals').select('*, profiles(name,department), checkins(actual_value,quarter,created_at)').order('created_at', { ascending: false })
    if(error){ console.error('Failed to load achievements', error); return }
    // pick latest checkin per goal
    const rows = (data || []).map(g => {
      const latest = (g.checkins || []).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))[0]
      return {
        goal_id: g.id,
        employee_id: g.employee_id,
        employee_name: g.profiles?.name || null,
        department: g.profiles?.department || null,
        title: g.title,
        quarter: g.quarter,
        uom: g.uom,
        target_value: g.target_value,
        latest_actual: latest?.actual_value || null,
        progress: g.progress,
        status: g.status
      }
    })
    setAchievements(rows)
  }

  function toCSVRows(rows){
    const hdr = ['goal_id','employee_id','employee_name','department','title','quarter','uom','target_value','latest_actual','progress','status']
    const lines = [hdr.join(',')]
    for(const r of rows){
      const cols = [r.goal_id, r.employee_id, r.employee_name, r.department, r.title, r.quarter, r.uom, r.target_value, r.latest_actual, r.progress, r.status]
      const esc = cols.map(c=>`"${String(c ?? '') .replace(/"/g,'""')}"`)
      lines.push(esc.join(','))
    }
    return lines.join('\n')
  }

  function downloadAchievements(){
    const csv = toCSVRows(achievements)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `achievement_report_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toCSV(rows){
    const hdr = ['id','user_id','action','module','metadata','timestamp']
    const lines = [hdr.join(',')]
    for(const r of rows){
      const cols = [r.id, r.user_id, r.action, r.module, JSON.stringify(r.metadata || {}), r.timestamp]
      const esc = cols.map(c=>`"${String(c).replace(/"/g,'""')}"`)
      lines.push(esc.join(','))
    }
    return lines.join('\n')
  }

  function download(){
    const csv = toCSV(logs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Reports</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600">Admin reports and exports for compliance and analytics.</p>

          <div className="mt-4 mb-2 flex gap-2 items-center">
            <label className="text-sm">From</label>
            <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="p-2 border rounded" />
            <label className="text-sm">To</label>
            <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="p-2 border rounded" />
            <button onClick={load} className="px-3 py-1 bg-primary-500 text-white rounded">Filter</button>
            <button onClick={download} className="px-3 py-1 border rounded">Download CSV</button>
            <button onClick={async ()=>{ await loadAchievements(); downloadAchievements() }} className="px-3 py-1 border rounded">Export Achievement Report</button>
          </div>

          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-sm text-slate-600">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Module</th>
                    <th className="pb-2">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l=> (
                    <tr key={l.id} className="border-t">
                      <td className="py-2 text-sm">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-2 text-sm">{l.user_id}</td>
                      <td className="py-2 text-sm">{l.action}</td>
                      <td className="py-2 text-sm">{l.module}</td>
                      <td className="py-2 text-sm"><pre className="whitespace-pre-wrap">{JSON.stringify(l.metadata)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
