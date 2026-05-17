import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import DeptBarChart from '../components/analytics/DeptBarChart'
import TeamHeatmap from '../components/analytics/TeamHeatmap'

export default function Dashboard(){
  const [metrics, setMetrics] = useState({})

  async function load(){
    try{
      const results = await Promise.all([
        supabase.from('goals').select('*'),
        supabase.from('profiles').select('*')
      ])
      var goals = results[0]?.data || []
      var profiles = results[1]?.data || []
    }catch(err){
      console.error('Dashboard load error', err)
      // fallback to empty arrays so UI still renders
      var goals = []
      var profiles = []
    }

    const totalGoals = (goals && Array.isArray(goals)) ? goals.length : 0
    const approved = (goals && Array.isArray(goals)) ? goals.filter(g=> g.status === 'approved').length : 0
    const byStatus = goals?.reduce((acc,g)=>{ acc[g.status] = (acc[g.status]||0)+1; return acc }, {})

    // Dept aggregates: completion % = approved / total goals in dept
    const deptMap = {}
    const profileMap = {}
    (profiles || []).forEach(p=> profileMap[p.id] = p)
    (goals || []).forEach(g=>{
      const p = profileMap[g.employee_id]
      const dept = p?.department || 'Unknown'
      deptMap[dept] = deptMap[dept] || { total:0, approved:0 }
      deptMap[dept].total += 1
      if(g.status === 'approved') deptMap[dept].approved += 1
    })

    const deptData = Object.entries(deptMap).map(([department, v])=> ({ department, completion: Math.round((v.approved / Math.max(1, v.total))*100) }))

    // Team heatmap: employees x quarters completion (average progress)
    const quarters = ['Q1','Q2','Q3','Q4']
    const memberMap = {}
    (profiles || []).forEach(p=> memberMap[p.id] = { name: p.name || p.id, values: {} })
    (goals || []).forEach(g=>{
      const m = memberMap[g.employee_id] || { name: g.employee_id, values: {} }
      const q = g.quarter || 'Q1'
      m.values[q] = Math.max(m.values[q] || 0, g.progress || 0)
      memberMap[g.employee_id] = m
    })
    const rows = Object.values(memberMap)

    setMetrics({ totalGoals, approved, byStatus, deptData, rows, quarters })
  }

  useEffect(()=>{ load() },[])

  useEffect(()=>{
    function handler(){ load() }
    window.addEventListener('goals:changed', handler)
    return () => window.removeEventListener('goals:changed', handler)
  },[])

  const pieData = Object.entries(metrics.byStatus || {}).map(([k,v])=> ({ name:k, value:v }))
  const colors = ['#6366F1','#34D399','#F59E0B','#EF4444']

  return (
    <div className="max-w-6xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex flex-col items-start">
          <div className="text-sm text-slate-500">Total Goals</div>
          <div className="text-2xl font-bold mt-2">{(metrics.totalGoals || 0)}</div>
        </div>
        <div className="card p-4 flex flex-col items-start">
          <div className="text-sm text-slate-500">Approved</div>
          <div className="text-2xl font-bold mt-2">{(metrics.approved || 0)}</div>
        </div>
        <div className="card p-4 flex flex-col items-start">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="text-2xl font-bold mt-2">{((metrics.totalGoals || 0) - (metrics.approved || 0))}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 card" style={{ height: 320 }}>
          <h3 className="font-semibold mb-2">Goal Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <DeptBarChart data={metrics.deptData || []} />
        </div>
      </div>

      <div className="mt-6">
        <TeamHeatmap rows={metrics.rows || []} quarters={metrics.quarters || ['Q1','Q2','Q3','Q4']} />
      </div>
    </div>
  )
}
