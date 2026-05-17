require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
app.use(cors())
app.use(express.json())

const OPENAI_KEY = process.env.OPENAI_API_KEY

app.post('/ai/suggest', async (req, res) => {
  try{
    const { role, department } = req.body || {}

    if(OPENAI_KEY){
      // Use OpenAI Chat Completions to generate goal suggestions
      const prompt = `You are an enterprise product assistant. Create 3 SMART quarterly goals for a ${role || 'employee'} in the ${department || 'general'} department. Each goal must include: title, short description, suggested weightage (integer, min 10), and quarter (Q1/Q2/Q3/Q4). Ensure total weightage does not exceed 100 and no single goal is under 10. Return JSON array like [{"title":"...","description":"...","weightage":30,"quarter":"Q1"}, ...]`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: 'You generate concise JSON responses for goals.' }, { role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` }
      })

      const text = response.data.choices?.[0]?.message?.content || ''
      // try parse JSON from text
      let parsed = []
      try{ parsed = JSON.parse(text) }catch(e){
        // attempt to extract JSON substring
        const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if(m) parsed = JSON.parse(m[0])
      }
      return res.json({ ok: true, suggestions: parsed })
    }

    // Fallback heuristic suggestions when no OpenAI key
    const suggestions = [
      { title: 'Increase customer retention', description: 'Improve customer retention by enhancing onboarding and outreach.', weightage: 30, quarter: 'Q2' },
      { title: 'Improve NPS by 5 pts', description: 'Run targeted surveys and closed-loop feedback to lift NPS.', weightage: 30, quarter: 'Q2' },
      { title: 'Reduce churn from top 10 accounts', description: 'Personalized account reviews and health checks.', weightage: 40, quarter: 'Q2' }
    ]
    res.json({ ok: true, suggestions })
  }catch(err){
    console.error('AI suggest error', err?.response?.data || err)
    res.status(500).json({ ok: false, error: 'AI generation failed' })
  }
})

const port = process.env.AI_PORT || 7070
app.listen(port, ()=> console.log(`AI service listening on port ${port}`))
