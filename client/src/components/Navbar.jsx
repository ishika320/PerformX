import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { motion } from 'framer-motion'

export default function Navbar(){
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const nav = useNavigate()
  const location = useLocation()

  const hideOnPaths = ['/', '/login', '/register']

  useEffect(()=>{
    let mounted = true
    async function init(){
      const res = await supabase.auth.getUser()
      const u = res.data.user
      if(!mounted) return
      setUser(u)
      if(u){
        const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle()
        if(!data){
          // auto-create a lightweight profile for OAuth/magic-link sign-ins
          const up = await supabase.from('profiles').upsert({ id: u.id, name: u.email || null, role: 'employee' })
          if(up.error) console.error('Profile upsert failed', up.error)
          if(mounted) setProfile(up.data?.[0] || null)
        } else {
          if(mounted) setProfile(data)
        }
      }
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if(!u) setProfile(null)
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  },[])

  async function logout(){
    await supabase.auth.signOut()
    nav('/login')
  }

  // hide the navbar entirely on public-facing pages like home/register/login
  if(hideOnPaths.includes(location.pathname)) return null

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-auto">
      <div className="container mx-auto px-4">
        <div className="backdrop-blur-sm bg-white/60 border border-white/30 rounded-2xl p-3 flex items-center justify-between shadow">
          <div>
            <Link to="/" className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">PerformX</Link>
            <div className="text-xs text-slate-600">GoalSync AI</div>
          </div>
          {['/login','/register'].includes(location.pathname) ? (
            <nav className="space-x-4 flex items-center">
              <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/" className="text-slate-700 hover:text-primary-600">Home</Link></motion.div>
            </nav>
          ) : (
            <nav className="space-x-4 flex items-center">
              {/* Role-specific navigation matching the diagram */}
              {profile?.role === 'employee' && (
                <>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/employee" className="text-slate-700 hover:text-primary-600">Home</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/goals" className="text-slate-700 hover:text-primary-600">Goal creation</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/goals" className="text-slate-700 hover:text-primary-600">My Goals</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/checkins" className="text-slate-700 hover:text-primary-600">Quarterly update</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/goals" className="text-slate-700 hover:text-primary-600">Shared goals</Link></motion.div>
                </>
              )}

              {profile?.role === 'manager' && (
                <>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/manager" className="text-slate-700 hover:text-primary-600">Home</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/approvals" className="text-slate-700 hover:text-primary-600">Goal approval</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/team-dashboard" className="text-slate-700 hover:text-primary-600">Team goals</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/manager-checkins" className="text-slate-700 hover:text-primary-600">Check-in module</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/team-dashboard" className="text-slate-700 hover:text-primary-600">Push shared goals</Link></motion.div>
                </>
              )}

              {profile?.role === 'admin' && (
                <>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/admin" className="text-slate-700 hover:text-primary-600">Home</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/settings" className="text-slate-700 hover:text-primary-600">Cycle management</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/users" className="text-slate-700 hover:text-primary-600">Org hierarchy</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/reports" className="text-slate-700 hover:text-primary-600">Reports & exports</Link></motion.div>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/audit" className="text-slate-700 hover:text-primary-600">Audit log</Link></motion.div>
                </>
              )}

              {user ? (
                <>
                  <motion.div whileHover={{ y: -2 }} className="inline-block"><Link to="/notifications" className="text-slate-700">Notifications</Link></motion.div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={logout} className="ml-2 px-3 py-1 bg-slate-100 rounded-full">Logout</motion.button>
                </>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} className="ml-2 inline-block"><Link to="/login" className="px-3 py-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-full">Login</Link></motion.div>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
