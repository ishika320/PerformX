# PerformX — GoalSync AI

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

```env
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

Run the SQL in `client/db/rls_policies.sql` in your Supabase SQL editor to enable row-level security policies for:

- `profiles`
- `goals`
- `notifications`
- `audit_logs`

## Optional AI-Assisted Goal Suggestions

The repository includes a lightweight AI microservice at `server/ai.js`.

- It can call OpenAI if `OPENAI_API_KEY` is set in `server/.env`.
- Otherwise, it returns heuristic suggestions.

To run it locally:

```bash
cd server
npm install
node ai.js
```

The frontend `GoalForm` includes an **AI Suggest** button that calls this service using:

`POST /ai/suggest`

and can pre-fill the form with the first suggestion.

> **Note:** AI functionality is optional and requires a valid OpenAI API key for OpenAI-based suggestions.

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
```

## Seed Data

A seeder is provided at `server/seed.js`.

It uses the Supabase service role key to create authentication users and insert profiles and goals.

To run it:

```bash
cd server
npm install
```

Create a `.env` file containing:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

Then run:

```bash
node seed.js
```

> **Warning:** The seed script creates real authentication users in your Supabase project. Use it carefully, preferably with a development or test project.

## Security

Never commit sensitive credentials to GitHub.

Do not expose:

- Supabase Service Role Key
- OpenAI API Key
- SMTP Password
- Database Password
- Other private credentials

Use environment variables for sensitive configuration.

## Future Improvements

- Automated testing
- CI/CD pipeline
- Advanced performance analytics
- Improved AI-assisted goal recommendations
- Enhanced notification management
- Production monitoring
- Additional role-based workflows

## Author

**Ishika**

B.Tech — Computer Science & Engineering
