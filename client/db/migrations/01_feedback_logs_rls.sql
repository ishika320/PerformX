-- Migration: Create feedback_logs and RLS policies
-- Run this in your Supabase SQL editor (SQL > New query) as a single script.

create table if not exists feedback_logs (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  author_id uuid references profiles(id),
  author_role text,
  context text,
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_goal on feedback_logs(goal_id);

-- Enable RLS
alter table feedback_logs enable row level security;

-- Allow managers and admins to insert feedback
create policy if not exists feedback_insert_managers on feedback_logs for insert with check (
  (select role from profiles where id = auth.uid()) in ('manager','admin')
);

-- Allow select for goal owner, their manager, or admin
create policy if not exists feedback_select_owner_manager_admin on feedback_logs for select using (
  exists (
    select 1 from goals g where g.id = goal_id and (
      g.employee_id = auth.uid()
      or exists (select 1 from profiles p where p.id = g.employee_id and p.manager_id = auth.uid())
    )
  )
  or (select role from profiles where id = auth.uid()) = 'admin'
);

-- Allow managers/admins to delete
create policy if not exists feedback_delete_managers on feedback_logs for delete using (
  (select role from profiles where id = auth.uid()) in ('manager','admin')
);

-- Optional: grant usage to authenticated
-- grant select, insert, delete on feedback_logs to authenticated;
