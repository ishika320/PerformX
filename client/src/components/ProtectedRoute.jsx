import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, requireRole }){
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(()=>{
    let mounted = true
    supabase.auth.getUser().then(async res=>{
      const user = res.data.user
      if(!user){ if(mounted){ setAllowed(false); setLoading(false) } ; return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if(!mounted) return
      // support requireRole as a single role or array of roles
      // Enforce strict role matching to avoid mixing role-specific pages.
      const userRole = data?.role
      if(!userRole){ setAllowed(false); setLoading(false); return }

      if(!requireRole){
        setAllowed(true)
      } else if(Array.isArray(requireRole)){
        setAllowed(requireRole.includes(userRole))
      } else if(typeof requireRole === 'string'){
        // strict match: only allow exact role (no implicit hierarchy)
        setAllowed(userRole === requireRole)
      } else {
        setAllowed(false)
      }
      setLoading(false)
    })
    return ()=> mounted = false
  },[])

  if(loading) return <div className="text-center p-8">Loading...</div>
  if(!allowed) return <Navigate to="/login" replace />
  return children
}
