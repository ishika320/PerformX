import React from 'react'
import { Link } from 'react-router-dom'

export default function AdminHome(){
  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Admin / HR Home</h2>
      <p className="text-slate-600 mb-4">Responsibilities: Configure cycles; manage org hierarchy; oversee completion rates.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/settings" className="p-4 border rounded shadow hover:shadow-md">Cycle & System Settings</Link>
        <Link to="/users" className="p-4 border rounded shadow hover:shadow-md">User Management</Link>
        <Link to="/audit" className="p-4 border rounded shadow hover:shadow-md">Audit Logs</Link>
      </div>
    </div>
  )
}
