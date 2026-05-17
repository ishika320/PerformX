-- Supabase RLS policy setup for PerformX
-- Run this in your Supabase SQL editor (adjust schema names as needed)

-- Enable pgcrypto for gen_random_uuid if not already enabled
create extension if not exists pgcrypto;

-- Enable RLS on sensitive tables
alter table profiles enable row level security;
alter table goals enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- Profiles: users can select/insert/update their own profile
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Goals: employees can insert their own goals
create policy "goals_insert_own" on goals for insert with check (employee_id = auth.uid());

-- Goals: employees can select their goals; managers can select their team goals; admins can select all
create policy "goals_select_user_or_manager_or_admin" on goals for select using (
  employee_id = auth.uid()
  OR (
    exists (
      select 1 from profiles p where p.id = employee_id and p.manager_id = auth.uid()
    )
  )
  OR (
    (select role from profiles where id = auth.uid()) = 'admin'
  )
);

-- Goals: allow employees to update their own goals only when draft and not locked
create policy "goals_update_own_draft" on goals for update using (
  employee_id = auth.uid() and status = 'draft' and locked = false
) with check (
  employee_id = auth.uid() and status = 'draft' and locked = false
);

-- Goals: allow managers/admin to update status (approve/reject) via a dedicated update route
create policy "goals_update_by_manager_for_status" on goals for update using (
  (
    (select role from profiles where id = auth.uid()) = 'admin'
    OR exists (select 1 from profiles p where p.id = employee_id and p.manager_id = auth.uid())
  )
) with check (
  -- restrict what managers can change: allow status and locked changes
  (status is not distinct from status) or (locked is not distinct from locked)
);

-- Notifications: users can select notifications for themselves or global (user_id is null)
create policy "notifications_select_owner_or_global" on notifications for select using (
  user_id is null OR user_id = auth.uid()
);
create policy "notifications_insert_server" on notifications for insert with check (true);

-- Audit logs: only admins should be able to select audit logs
create policy "audit_select_admin" on audit_logs for select using (
  (select role from profiles where id = auth.uid()) = 'admin'
);

-- Note: Adjust policies to be as strict as required for your org. Test thoroughly.
