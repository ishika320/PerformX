# PerformX — GoalSync AI

This repository contains a starter React + Supabase web app for an enterprise goal alignment platform.

Features included in this scaffold:
- Supabase authentication and profile creation
- Goal creation with client-side validation (weightage rules)
- Manager approval flow (approve/reject)
- Audit logs for create/approve actions
- Dashboard with charts (Recharts)

Quick start

1. Create a Supabase project and run the SQL in `client/db/schema.sql` to create tables.
2. In your Supabase project, enable Email signups.
3. Copy your Supabase URL and ANON KEY.
4. In `client/` create a `.env` file with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

5. Install and run the client:

```bash
cd client
npm install
npm run dev
```

Notifier service (email delivery)

1. Configure SMTP and Supabase service key in `server/.env` (see `.env.example`).
2. Run the notifier to send emails when notifications are created:

```bash
cd server
npm install
npm start
```

RLS policies

- Run the SQL in `client/db/rls_policies.sql` in your Supabase SQL editor to enable row-level security policies for `profiles`, `goals`, `notifications`, and `audit_logs`.

AI service (goal suggestions)

- The repo includes a lightweight AI microservice at `server/ai.js`. It will call OpenAI if `OPENAI_API_KEY` is set in `server/.env`; otherwise it returns heuristic suggestions.
- To run it locally:

```bash
cd server
npm install
node ai.js
```

- The frontend `GoalForm` includes an "AI Suggest" button that calls this service on `POST /ai/suggest` and pre-fills the form with the first suggestion.



Notes
- This is a frontend-first, Supabase-backed starter. For production, add row-level security policies, server-side functions, and refresh-token handling.
- Extend the UI, polish styles, and add CI/CD following the hackathon roadmap.

Seed script

- A seeder is provided at `server/seed.js`. It uses the Supabase service role key to create Auth users and insert profiles + goals. To run it:

```bash
cd server
npm install
# create a .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
node seed.js
```

Be careful: the script creates real Auth users in your Supabase project.
