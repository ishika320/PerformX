import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentQuarter } from '../lib/constants'

export default function CompletionDashboard(){
  const [profile, setProfile] = useState(null)
  const [team, setTeam] = useState([])
  const [status, setStatus] = useState({})

  async function load(){
    const ures = await supabase.auth.getUser(); const user = ures.data.user
    if(!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(p)
    if(!p?.department) return
    const { data: members } = await supabase.from('profiles').select('id,name').eq('department', p.department).order('name', { ascending: true })
    setTeam(members || [])
    const memberIds = (members || []).map(m => m.id)
    if(!memberIds.length) return
    const q = getCurrentQuarter()
    const { data: checkins } = await supabase.from('checkins').select('goal_id, employee_id, quarter, created_at').in('employee_id', memberIds).eq('quarter', q)
    const map = {}
    (checkins || []).forEach(c => { map[c.employee_id] = map[c.employee_id] || []; map[c.employee_id].push(c) })
    const st = {}
    (members || []).forEach(m => { st[m.id] = { submitted: (map[m.id] || []).length > 0, count: (map[m.id] || []).length } })
    setStatus(st)
  }

  useEffect(()=>{ load() },[])

  function exportCSV(){
    const hdr = ['employee_id','employee_name','submitted','count']
    const lines = [hdr.join(',')]
    for(const m of team){
      const s = status[m.id] || { submitted: false, count: 0 }
      const cols = [m.id, m.name, s.submitted ? 'yes' : 'no', s.count]
      const esc = cols.map(c => `"${String(c || '').replace(/"/g,'""')}"`)
      lines.push(esc.join(','))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `completion_${getCurrentQuarter()}_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <div className="card">
        <div className="card-header"><h2 className="text-xl font-semibold">Completion Dashboard — {getCurrentQuarter()}</h2></div>
        <div className="p-6">
          <p className="text-slate-600">Shows which team members have submitted check-ins this quarter.</p>
          <div className="mt-4 mb-2 flex gap-2"><button onClick={exportCSV} className="px-3 py-1 border rounded">Export CSV</button></div>

          <div className="mt-4">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-slate-600"><th>Name</th><th>Submitted</th><th>Count</th></tr>
              </thead>
              <tbody>
                {team.map(m => (
                  <tr key={m.id} className="border-t"><td className="py-2">{m.name}</td><td className="py-2">{status[m.id]?.submitted ? 'Yes' : 'No'}</td><td className="py-2">{status[m.id]?.count || 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
