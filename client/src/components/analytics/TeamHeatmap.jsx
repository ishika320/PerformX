import React from 'react'

function colorFor(value){
  // value expected 0..100
  const v = Math.max(0, Math.min(100, Math.round(value)))
  // green for high, red for low
  const red = Math.round((100 - v) * 2.55)
  const green = Math.round(v * 2.55)
  return `rgb(${red}, ${green}, 80)`
}

export default function TeamHeatmap({ rows, quarters }){
  // rows: [{ name, values: { Q1: 50, Q2: 80, ... } }]
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Team Heatmap</h3>
      <div className="overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2">Member</th>
              {quarters.map(q=> <th key={q} className="p-2 text-center">{q}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.name} className="border-t">
                <td className="p-2">{r.name}</td>
                {quarters.map(q=> (
                  <td key={q} className="p-2 text-center">
                    <div style={{ background: colorFor(r.values[q] ?? 0), height: 28, borderRadius: 4 }} title={`${r.values[q] ?? 0}%`}>
                      <div className="text-xs text-white" style={{ paddingTop:4 }}>{r.values[q] ? `${r.values[q]}%` : '—'}</div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
