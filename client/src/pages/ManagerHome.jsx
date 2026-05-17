import React from 'react'
import { Link } from 'react-router-dom'

export default function ManagerHome(){
  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Manager Home (L1)</h2>
      <p className="text-slate-600 mb-4">Responsibilities: Review & approve goals; conduct quarterly check-ins; log feedback.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/approvals" className="p-4 border rounded shadow hover:shadow-md">Approvals</Link>
        <Link to="/team-dashboard" className="p-4 border rounded shadow hover:shadow-md">Team Dashboard</Link>
        <Link to="/team-analytics" className="p-4 border rounded shadow hover:shadow-md">Team Analytics</Link>
      </div>
    </div>
  )
}
