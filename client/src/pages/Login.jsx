import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const nav = useNavigate()
  const [lastResp, setLastResp] = useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    try{
      const res = await supabase.auth.signInWithPassword({ email, password })
      if(res.error){
        console.error('Sign-in error response:', res)
        setLastResp(res)
        return setError(res.error.message || `Sign-in failed (status ${res.error.status})`)
      }

      // determine user role and redirect appropriately
      const userRes = await supabase.auth.getUser()
      const user = userRes.data.user
      if(!user) return nav('/login')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if(!profile) return nav('/complete-profile')
      const role = profile?.role || 'employee'
      if(role === 'employee') nav('/employee')
      else if(role === 'manager') nav('/manager')
      else if(role === 'admin') nav('/admin')
      else nav('/')
    }catch(err){
      console.error('Unexpected sign-in error', err)
      setLastResp(err)
      setError(err?.message || 'Unexpected sign-in error — check console/network tab')
    }
  }

  async function signInWithProvider(provider){
    setError(null)
    try{
      await supabase.auth.signInWithOAuth({ provider })
    }catch(err){ setError(err.message || 'OAuth failed') }
  }

  async function sendMagicLink(){
    setError(null)
    if(!email) return setError('Enter email first')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if(error) return setError(error.message)
    alert('Magic link sent to ' + email)
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full p-2 border rounded" />
        <button className="w-full bg-indigo-600 text-white p-2 rounded">Sign in</button>
      </form>

      <div className="my-4 text-center text-sm text-slate-500">or continue with</div>
      <div className="flex gap-2">
        <button onClick={()=>signInWithProvider('google')} className="flex-1 p-2 border rounded bg-white">Google</button>
        <button onClick={()=>signInWithProvider('github')} className="flex-1 p-2 border rounded bg-white">GitHub</button>
      </div>

      <div className="mt-4">
        <div className="text-sm text-slate-500 mb-2">Or sign in with a magic link</div>
        <div className="flex gap-2">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email for magic link" className="flex-1 p-2 border rounded" />
          <button onClick={sendMagicLink} className="px-3 py-2 bg-primary-500 text-white rounded">Send</button>
        </div>
      </div>
      {/* Debug info: show environment status and last Supabase response when errors occur */}
      <div className="mt-4 text-xs text-slate-500">
        <div className="mb-2">Env status: <span className="font-medium">{import.meta.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL set' : 'VITE_SUPABASE_URL missing'}</span> • <span className="font-medium">{import.meta.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY set' : 'VITE_SUPABASE_ANON_KEY missing'}</span></div>
        {lastResp && (
          <details className="bg-slate-50 p-3 rounded border">
            <summary className="cursor-pointer">Last auth response (click to expand)</summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(lastResp, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  )
}
