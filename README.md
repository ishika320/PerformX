# PerformX — GoalSync 

PerformX is a full-stack employee goal setting and performance tracking platform designed to help organizations manage employee goals, approvals, progress tracking, notifications, and performance analytics.

The platform provides role-based workflows for employees and managers and uses React.js, Node.js, Supabase, and PostgreSQL.


## Features
- Supabase authentication and profile creation
- Role-based employee and manager workflows
- Goal creation with client-side validation
- Goal weightage validation
- Manager approval and rejection flow
- Goal progress tracking
- Goal check-ins
- Shared goals
- Notifications
- Audit logs
- Performance dashboard with charts
- Email notification service
- Row-Level Security (RLS)
- Optional AI-assisted goal suggestions


## Setup Instructions

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

## Email Notification Service

1. Configure SMTP and Supabase service key in `server/.env` (see `.env.example`).
2. Run the notifier to send emails when notifications are created:

```bash
cd server
npm install
npm start
```

## Row-Level Security

- Run the SQL in `client/db/rls_policies.sql` in your Supabase SQL editor to enable row-level security policies for `profiles`, `goals`, `notifications`, and `audit_logs`.

## Optional AI-Assisted Goal Suggestions

- The repo includes a lightweight AI microservice at `server/ai.js`. It will call OpenAI if `OPENAI_API_KEY` is set in `server/.env`; otherwise it returns heuristic suggestions.
- To run it locally:

```bash
cd server
npm install
node ai.js
```

- The frontend `GoalForm` includes an "AI Suggest" button that calls this service on `POST /ai/suggest` and pre-fills the form with the first suggestion.



## Project Architecture

```text
React.js Frontend
       |
       v
Supabase / Backend Services
       |
       +---- Authentication
       |
       +---- PostgreSQL Database
       |
       +---- Row-Level Security
       |
       +---- Notifications
       |
       +---- Audit Logs
       |
       v
Node.js Services
       |
       +---- Email Notifications
       |
       +---- Optional AI Goal Suggestions

## Seed Data

- A seeder is provided at `server/seed.js`. It uses the Supabase service role key to create Auth users and insert profiles + goals. To run it:

```bash
cd server
npm install
# create a .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
node seed.js
```

Be careful: the script creates real Auth users in your Supabase project.
