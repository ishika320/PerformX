import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Audit(){
  const [logs, setLogs] = useState([])

  async function load(){
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200)
    setLogs(data || [])
  }

  useEffect(()=>{ load() },[])

  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Audit Logs</h2>
      <div className="space-y-2">
        {logs.map(l=> (
          <div key={l.id} className="p-2 bg-white rounded shadow-sm flex justify-between">
            <div>
              <div className="text-sm"><strong>{l.action}</strong> — {l.module}</div>
              <div className="text-xs text-slate-500">by {l.user_id} • {new Date(l.timestamp).toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-600">{JSON.stringify(l.metadata || {})}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
