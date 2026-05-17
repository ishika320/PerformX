import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

export default function DeptBarChart({ data }){
  return (
    <div className="bg-white p-4 rounded shadow" style={{ height: 320 }}>
      <h3 className="font-semibold mb-2">Department Performance</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="department" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="completion" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
