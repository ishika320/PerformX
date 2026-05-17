import React from 'react'
import { Link } from 'react-router-dom'

export default function EmployeeHome(){
  return (
    <div className="max-w-4xl mx-auto pt-24">
      <h2 className="text-2xl font-semibold mb-4">Employee Home</h2>
      <p className="text-slate-600 mb-4">Responsibilities: Draft goals; enter quarterly achievement; update progress status.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/goals" className="p-4 border rounded shadow hover:shadow-md">My Goals</Link>
        <Link to="/checkins" className="p-4 border rounded shadow hover:shadow-md">Check-ins</Link>
        <Link to="/progress" className="p-4 border rounded shadow hover:shadow-md">Progress</Link>
      </div>
    </div>
  )
}
