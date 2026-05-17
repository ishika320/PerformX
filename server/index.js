require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
const express = require('express')
const bodyParser = require('body-parser')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if(!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase config in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Nodemailer transporter (optional)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

async function sendEmail(to, subject, text, html){
  if(!process.env.SMTP_HOST) return null
  const info = await transporter.sendMail({ from: process.env.FROM_EMAIL, to, subject, text, html })
  console.log('Email sent:', info.messageId)
}

// Simple admin API protected by ADMIN_API_KEY header or short-lived JWT
const jwt = require('jsonwebtoken')
const app = express()
app.use(bodyParser.json())

function requireAdminKey(req, res, next){
  const key = req.headers['x-admin-key'] || req.query.admin_key
  if(!process.env.ADMIN_API_KEY || !key || key !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

function verifyAdminToken(req, res, next){
  const auth = req.headers.authorization || ''
  if(!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const token = auth.split(' ')[1]
  try{
    jwt.verify(token, process.env.ADMIN_API_KEY)
    next()
  }catch(err){
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Create a new user via Supabase Admin API and upsert profile
app.post('/admin/create-user', async (req, res) => {
  // allow either short-lived JWT (Authorization) or direct admin key header
  const auth = req.headers.authorization || ''
  const hasKey = req.headers['x-admin-key'] || req.query.admin_key
  if(auth.startsWith('Bearer ')){
    try{ jwt.verify(auth.split(' ')[1], process.env.ADMIN_API_KEY) }catch(e){ return res.status(401).json({ error: 'Invalid token' }) }
  } else if(hasKey){
    if(!process.env.ADMIN_API_KEY || hasKey !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' })
  } else {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try{
    const { email, password, role='employee', name, department, manager_id } = req.body
    if(!email) return res.status(400).json({ error: 'email required' })

    // create user via admin API
    const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if(created.error) return res.status(500).json({ error: created.error.message })
    const user = created.data.user

    // upsert profile
    await supabase.from('profiles').upsert({ id: user.id, name, role, department, manager_id })

    // log audit
    await supabase.from('audit_logs').insert({ user_id: user.id, action: 'admin_create_user', module: 'admin', metadata: { email, role } })

    return res.json({ ok: true, user: { id: user.id, email: user.email } })
  }catch(err){
    console.error('create-user error', err)
    return res.status(500).json({ error: String(err) })
  }
})

// Admin login to exchange admin key for a short-lived JWT
app.post('/admin/login', (req, res) => {
  const { admin_key } = req.body
  if(!process.env.ADMIN_API_KEY || !admin_key || admin_key !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' })
  const token = jwt.sign({ admin: true }, process.env.ADMIN_API_KEY, { expiresIn: '15m' })
  return res.json({ ok: true, token })
})

// Export achievements CSV (protected)
app.get('/admin/export/achievements', verifyAdminToken, async (req, res) => {
  try{
    // fetch goals with profile and latest checkin
    const { data } = await supabase.from('goals').select('id,title,quarter,target_value,uom,weightage,progress,status,employee_id, profiles(id,name,email), checkins!inner(id,actual_value,created_at)').limit(10000)
    // fallback simpler query if above fails
    let rows = data || []
    // build CSV
    const headers = ['goal_id','employee_id','employee_name','title','quarter','target_value','uom','weightage','last_actual','progress','status']
    const csv = [headers.join(',')]
    for(const g of rows){
      const last = (g.checkins && g.checkins.length) ? g.checkins[0].actual_value : ''
      const name = (g.profiles && g.profiles.name) ? g.profiles.name : ''
      csv.push([g.id,g.employee_id,name,g.title,g.quarter,g.target_value,g.uom,g.weightage,last,g.progress,g.status].map(v=>String(v).replace(/"/g,'""')).join(','))
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="achievements.csv"')
    return res.send(csv.join('\n'))
  }catch(err){
    console.error('Export failed', err)
    return res.status(500).json({ error: String(err) })
  }
})

// start notifier subscription and express server
async function start(){
  console.log('Notifier service starting, subscribing to notifications...')

  const channel = supabase.channel('public:notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
      try{
        const n = payload.new
        console.log('New notification:', n)
        // If notification has user_id, fetch profile to get email
        let recipients = []
        if(n.user_id){
          const { data: p } = await supabase.from('profiles').select('id, name').eq('id', n.user_id).single()
          const u = await supabase.auth.admin.getUserById(n.user_id)
          if(u && u.data && u.data.user && u.data.user.email) recipients.push(u.data.user.email)
        } else {
          // broadcast: send to all admins (example)
          const { data: admins } = await supabase.from('profiles').select('id').eq('role','admin')
          for(const a of admins || []){
            const u = await supabase.auth.admin.getUserById(a.id)
            if(u && u.data && u.data.user && u.data.user.email) recipients.push(u.data.user.email)
          }
        }

        // send email to recipients if SMTP configured
        if(recipients.length && process.env.SMTP_HOST){
          for(const to of recipients){
            await sendEmail(to, n.type || 'Notification', n.message || '', `<pre>${JSON.stringify(n.data||{},null,2)}</pre>`)
          }
        }
      }catch(err){
        console.error('Error handling notification:', err)
      }
    })
    .subscribe()

  console.log('Subscribed to notifications channel')

  const port = Number(process.env.ADMIN_PORT || 5000)
  app.listen(port, ()=> console.log('Admin API listening on port', port))
}

start().catch(err=>{ console.error(err); process.exit(1) })
