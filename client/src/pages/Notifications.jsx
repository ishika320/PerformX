import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Notifications(){
  const [items, setItems] = useState([])

  async function load(){
    const userRes = await supabase.auth.getUser()
    const user = userRes.data.user
    if(!user) return
    const { data } = await supabase.from('notifications').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('created_at',{ascending:false})
    setItems(data || [])
  }

  useEffect(()=>{ load() },[])

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
      <div className="space-y-2">
        {items.map(n=> (
          <div key={n.id} className="p-3 bg-white rounded shadow-sm flex justify-between">
            <div>
              <div className="text-sm font-medium">{n.type}</div>
              <div className="text-sm text-slate-600">{n.message}</div>
            </div>
            <div className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
