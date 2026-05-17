require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if(!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function createUser(email, password, role, name, department, manager_id){
  try{
    console.log('Creating user:', email)
    const res = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    const user = res.data.user
    if(!user){ console.error('Failed create user', res); return null }
    // create profile
    await supabase.from('profiles').upsert({ id: user.id, name, role, department, manager_id })
    return user.id
  }catch(err){ console.error('createUser error', err); return null }
}

async function seed(){
  // sample accounts (change passwords for real use)
  const users = [
    { email: 'alice@example.com', password: 'Password123!', role: 'employee', name: 'Alice Employee', department: 'Sales', manager_id: null },
    { email: 'bob@example.com', password: 'Password123!', role: 'employee', name: 'Bob Employee', department: 'Sales', manager_id: null },
    { email: 'carol@example.com', password: 'Password123!', role: 'manager', name: 'Carol Manager', department: 'Sales', manager_id: null },
    { email: 'diane@example.com', password: 'Password123!', role: 'admin', name: 'Diane Admin', department: 'HR', manager_id: null }
  ]

  const ids = {}
  for(const u of users){
    const id = await createUser(u.email, u.password, u.role, u.name, u.department, u.manager_id)
    if(id) ids[u.email] = id
  }

  // link manager relationships if created
  if(ids['carol@example.com']){
    if(ids['alice@example.com']) await supabase.from('profiles').update({ manager_id: ids['carol@example.com'] }).eq('id', ids['alice@example.com'])
    if(ids['bob@example.com']) await supabase.from('profiles').update({ manager_id: ids['carol@example.com'] }).eq('id', ids['bob@example.com'])
  }

  // insert sample goals
  const alice = ids['alice@example.com']
  const bob = ids['bob@example.com']
  if(alice){
    await supabase.from('goals').insert([
      { employee_id: alice, title: 'Increase upsell rate', description: 'Drive upsell campaigns to existing customers', weightage: 30, quarter: 'Q2', status: 'approved', progress: 80 },
      { employee_id: alice, title: 'Improve onboarding', description: 'Reduce time-to-value for new customers', weightage: 30, quarter: 'Q2', status: 'submitted', progress: 40 }
    ])
  }
  if(bob){
    await supabase.from('goals').insert([
      { employee_id: bob, title: 'Reduce churn', description: 'Identify churn risk and act', weightage: 40, quarter: 'Q2', status: 'draft', progress: 10 }
    ])
  }

  console.log('Seeding complete. Created users:', Object.keys(ids))
}

seed().catch(err=>{ console.error(err); process.exit(1) })
