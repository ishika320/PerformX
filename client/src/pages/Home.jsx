import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Home(){
  return (
    <div className="relative overflow-hidden">
      {/* decorative blobs */}
      <div className="blob large" style={{ right: -160, top: -80, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', opacity: 0.6, animationDelay: '0s' }} />
      <div className="blob medium" style={{ left: -80, top: 120, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', opacity: 0.5, animationDelay: '1s' }} />
      <div className="blob small" style={{ right: 40, bottom: -40, background: 'linear-gradient(135deg,#34d399,#60a5fa)', opacity: 0.45, animationDelay: '2s' }} />

      <div className="max-w-5xl mx-auto text-center py-28 relative z-10 px-4">
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .6 }} className="card">
          <div className="card-header text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">PerformX — <span className="text-white/90">GoalSync AI</span></h1>
            <p className="mt-3 text-lg opacity-90">AI-powered enterprise goal alignment & performance intelligence — align teams, accelerate outcomes.</p>
          </div>
          <div className="p-8">
            <motion.div className="flex items-center justify-center gap-4" initial={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Link to="/register" className="hero-cta px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-md shadow">Get started</Link>
              <Link to="/login" className="px-6 py-3 border border-slate-200 rounded-md">Login</Link>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div whileHover={{ y: -6 }} className="p-4 border rounded-lg bg-white/80 shadow-sm">
                <div className="text-xl font-semibold">Draft & Track</div>
                <div className="text-sm text-slate-600 mt-2">Employees create goals, log achievements, and monitor progress.</div>
              </motion.div>
              <motion.div whileHover={{ y: -6 }} className="p-4 border rounded-lg bg-white/80 shadow-sm">
                <div className="text-xl font-semibold">Approve & Coach</div>
                <div className="text-sm text-slate-600 mt-2">Managers review goals, give feedback and run structured check-ins.</div>
              </motion.div>
              <motion.div whileHover={{ y: -6 }} className="p-4 border rounded-lg bg-white/80 shadow-sm">
                <div className="text-xl font-semibold">Configure & Audit</div>
                <div className="text-sm text-slate-600 mt-2">Admins manage cycles, hierarchies and maintain audit trails.</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
