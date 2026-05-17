// Unit-of-Measure types and helper functions
export const UOM_TYPES = Object.freeze({
  MIN: 'Min', // Higher is better — Achievement ÷ Target
  MAX: 'Max', // Lower is better — Target ÷ Achievement
  TIMELINE: 'Timeline', // Date-based completion
  ZERO: 'Zero' // Zero is success
})

export function computeAchievementPercent({ uom, achievement, target }){
  const a = Number(achievement || 0)
  const t = Number(target || 0)
  if(uom === UOM_TYPES.MIN){
    if(t === 0) return 0
    return (a / t) * 100
  }
  if(uom === UOM_TYPES.MAX){
    if(a === 0) return 0
    return (t / a) * 100
  }
  if(uom === UOM_TYPES.TIMELINE){
    // caller should compute date difference; return 100 if completed on/before deadline else 0
    return a <= t ? 100 : 0
  }
  if(uom === UOM_TYPES.ZERO){
    return a === 0 ? 100 : 0
  }
  return 0
}

// Quarterly check-in windows (opens)
// Phase 1 (Goal Setting) opens on 1st May
export const CHECKIN_WINDOWS = Object.freeze({
  PHASE1: { opensMonth: 5 }, // May
  Q1: { opensMonths: [7] }, // July
  Q2: { opensMonths: [10] }, // October
  Q3: { opensMonths: [1] }, // January
  Q4: { opensMonths: [3,4] } // March / April
})

export function isCheckinOpen(quarter, date = new Date()){
  const month = date.getMonth() + 1 // JS months 0-11
  if(!quarter) return false
  const q = quarter.toUpperCase()
  const win = CHECKIN_WINDOWS[q]
  if(!win) return false
  const months = win.opensMonths || (win.opensMonth ? [win.opensMonth] : [])
  return months.includes(month)
}

export function getCurrentQuarter(date = new Date()){
  const m = date.getMonth() + 1
  if(m <= 3) return 'Q1'
  if(m <= 6) return 'Q2'
  if(m <= 9) return 'Q3'
  return 'Q4'
}

export default {
  UOM_TYPES,
  computeAchievementPercent,
  CHECKIN_WINDOWS,
  isCheckinOpen
}
