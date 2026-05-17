-- Supabase schema for PerformX
-- Run these in your Supabase SQL editor to create tables

create table if not exists profiles (
  id uuid primary key,
  name text,
  role text default 'employee',
  department text,
  manager_id uuid,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references profiles(id) on delete cascade,
  thrust_area text,
  uom text,
  target_value numeric,
  title text,
  description text,
  weightage int,
  quarter text,
  status text default 'draft',
  progress int default 0,
  is_shared boolean default false,
  locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists goal_updates (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  progress int,
  comment text,
  updated_by uuid,
  timestamp timestamptz default now()
);

create table if not exists approvals (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  manager_id uuid,
  decision text,
  comment text,
  timestamp timestamptz default now()
);

create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  action text,
  module text,
  metadata jsonb,
  timestamp timestamptz default now()
);

-- Notifications table for in-app and email triggers
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  type text,
  message text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Shared goals: a template that can be pushed to multiple employees
create table if not exists shared_goals (
  id uuid default gen_random_uuid() primary key,
  title text,
  thrust_area text,
  uom text,
  target_value numeric,
  owner_id uuid references profiles(id),
  department text,
  created_at timestamptz default now()
);

create table if not exists shared_goal_members (
  id uuid default gen_random_uuid() primary key,
  shared_goal_id uuid references shared_goals(id) on delete cascade,
  employee_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Link shared goal to individual goal rows
alter table goals
  add column if not exists shared_group_id uuid references shared_goals(id) on delete set null;

-- When a shared_goal is updated by the owner, propagate title/target/uom/thrust_area to linked goals
create or replace function sync_shared_goal_changes()
returns trigger as $$
begin
  -- allow this function to update linked goals even when a protective trigger exists
  perform set_config('app.allow_shared_update', 'true', true);
  update goals
  set title = new.title,
      thrust_area = new.thrust_area,
      uom = new.uom,
      target_value = new.target_value,
      updated_at = now()
  where shared_group_id = new.id and (locked = false or locked is null);
  perform set_config('app.allow_shared_update', 'false', true);
  return new;
end;
$$ language plpgsql;

drop trigger if exists shared_goal_update_trigger on shared_goals;
create trigger shared_goal_update_trigger
after update on shared_goals
for each row execute procedure sync_shared_goal_changes();

-- Check-ins table for quarterly actuals
create table if not exists checkins (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  employee_id uuid references profiles(id),
  quarter text,
  actual_value numeric,
  status text,
  comment text,
  created_at timestamptz default now()
);

-- Manager comments on check-ins
create table if not exists checkin_comments (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  manager_id uuid references profiles(id),
  comment text,
  created_at timestamptz default now()
);

-- General feedback/comments logged by managers during approvals or check-ins
create table if not exists feedback_logs (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  author_id uuid references profiles(id),
  author_role text,
  context text, -- e.g., 'approval', 'checkin', 'general'
  comment text,
  created_at timestamptz default now()
);

-- index for faster goal lookups
create index if not exists idx_feedback_goal on feedback_logs(goal_id);

-- Row Level Security for feedback_logs
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

-- Optionally, allow managers/admins to delete if needed
create policy if not exists feedback_delete_managers on feedback_logs for delete using (
  (select role from profiles where id = auth.uid()) in ('manager','admin')
);

-- Compute progress for a goal given its UoM, target and actual
create or replace function compute_progress(uom text, target numeric, actual numeric)
returns numeric as $$
declare
  result numeric := 0;
begin
  if uom is null then return 0; end if;
  if uom = 'Numeric' or uom = '%' then
    if target = 0 then result := 0; else result := (actual / target) * 100; end if;
  elsif uom = 'Timeline' then
    -- for timeline, assume actual is epoch day of completion compared to target (deadline)
    -- represent as 100 if completed on or before target, otherwise reduce
    if actual <= target then result := 100; else result := greatest(0, 100 - ((actual - target) * 1)); end if;
  elsif uom = 'Zero' then
    if actual = 0 then result := 100; else result := 0; end if;
  else
    result := 0;
  end if;
  if result < 0 then result := 0; end if;
  return least(result, 100);
end;
$$ language plpgsql;

-- When a checkin is inserted, update the goal's progress
create or replace function on_checkin_insert()
returns trigger as $$
declare
  newprog numeric;
  g record;
begin
  select uom, target_value into g from goals where id = new.goal_id;
  newprog := compute_progress(g.uom, g.target_value, new.actual_value);
  update goals set progress = round(newprog)::int, updated_at = now() where id = new.goal_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists checkin_insert_trigger on checkins;
create trigger checkin_insert_trigger
after insert on checkins
for each row execute procedure on_checkin_insert();

-- Recommended: enable Row Level Security (RLS) on sensitive tables and add policies.
-- Example (run in Supabase SQL editor):
-- alter table profiles enable row level security;
-- create policy "profiles_self" on profiles for select using (auth.uid() = id);
-- create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- Enable RLS and sensible policies for `goals`.
-- Run these in Supabase SQL editor to enforce row-level access.
alter table profiles enable row level security;
create policy if not exists profiles_self on profiles for select using (auth.uid() = id);
create policy if not exists profiles_insert on profiles for insert with check (auth.uid() = id OR (select role from profiles where id = auth.uid()) = 'admin');

alter table goals enable row level security;

-- Employees may insert goals for themselves; admins may insert for anyone
create policy if not exists goals_insert_own on goals for insert with check (
  employee_id = auth.uid() OR (select role from profiles where id = auth.uid()) = 'admin'
);

-- Select: allow employees to read their own goals, managers to read team goals, admins to read all
create policy if not exists goals_select_team on goals for select using (
  employee_id = auth.uid()
  OR exists (select 1 from profiles p where p.id = employee_id and p.manager_id = auth.uid())
  OR (select role from profiles where id = auth.uid()) = 'admin'
);

-- Update: allow employees to update their own goals (typically drafts), managers/admins to update team goals
create policy if not exists goals_update_own on goals for update using (
  auth.uid() = old.employee_id
  OR exists (select 1 from profiles p where p.id = old.employee_id and p.manager_id = auth.uid())
  OR (select role from profiles where id = auth.uid()) = 'admin'
)
with check (
  -- ensure employee_id isn't changed except by admin
  (new.employee_id = old.employee_id) AND (
    new.employee_id = auth.uid() OR (select role from profiles where id = auth.uid()) = 'admin'
  )
);

-- Delete: only owners or admins
create policy if not exists goals_delete_own on goals for delete using (
  auth.uid() = old.employee_id OR (select role from profiles where id = auth.uid()) = 'admin'
);

-- Note: The DB triggers (prevent_direct_submit, prevent_shared_field_change) still run and enforce stricter invariants.

-- Trigger to keep `updated_at` current
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists touch_goals_updated_at on goals;
create trigger touch_goals_updated_at
before update on goals
for each row execute procedure touch_updated_at();

-- Validation function to be called before submitting goals for approval.
-- Enforces: max 8 goals, min weight 10, total weight must equal 100.
create or replace function validate_goals_for_submit(p_employee_id uuid)
returns void as $$
declare
  cnt int;
  w_sum int;
  min_w int;
begin
  select count(*) into cnt from goals where employee_id = p_employee_id;
  if cnt > 8 then
    raise exception 'Maximum 8 goals allowed (found %)', cnt;
  end if;

  select sum(weightage) into w_sum from goals where employee_id = p_employee_id;
  if w_sum is null then w_sum := 0; end if;
  if w_sum <> 100 then
    raise exception 'Total weightage must equal 100%% — current total: %', w_sum;
  end if;

  select min(weightage) into min_w from goals where employee_id = p_employee_id;
  if min_w is not null and min_w < 10 then
    raise exception 'Minimum weight per goal is 10%% (found %)', min_w;
  end if;
end;
$$ language plpgsql;

-- helper: whether goal submission window is open (goal_window cycles)
create or replace function can_submit_goal_now() returns boolean language plpgsql as $$
begin
  if exists (
    select 1 from cycles c
    where c.cycle_type = 'goal_window'
      and now() between c.start_date and c.end_date
  ) then
    return true;
  end if;
  return false;
end;
$$;

-- RPC to submit all draft goals for an employee, enforcing validation and cycle window
create or replace function submit_goals_for_employee(p_employee_id uuid) returns void language plpgsql security definer as $$
declare
  cnt int;
begin
  if not can_submit_goal_now() then
    raise exception 'Goal submission window is closed';
  end if;

  perform validate_goals_for_submit(p_employee_id);

  -- allow controlled update via RPC only
  perform set_config('app.allow_submit_rpc', 'true', true);
  update goals set status = 'submitted', updated_at = now()
  where employee_id = p_employee_id and status = 'draft';
  perform set_config('app.allow_submit_rpc', 'false', true);

  -- notify manager(s)
  update profiles set updated_at = now() where id = p_employee_id; -- touch profile
  insert into audit_logs(user_id, action, module, metadata) values (p_employee_id, 'submit_goals', 'goals', jsonb_build_object('employee_id', p_employee_id));
  return;
end;
$$;

-- Prevent direct updates that set status to 'submitted' unless the session flag is set by the RPC
create or replace function prevent_direct_submit() returns trigger as $$
begin
  if (new.status = 'submitted' and (old.status is distinct from new.status)) then
    if current_setting('app.allow_submit_rpc', true) <> 'true' then
      raise exception 'Direct status update to submitted is not allowed. Use submit_goals_for_employee RPC.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_direct_submit on goals;
create trigger trg_prevent_direct_submit
before update on goals
for each row execute procedure prevent_direct_submit();

-- Prevent changes to shared goal fields by recipients (title/target/uom/thrust_area) unless allowed via sync function
create or replace function prevent_shared_field_change() returns trigger as $$
begin
  if new.shared_group_id is not null then
    if (coalesce(new.title,'') <> coalesce(old.title,'') or coalesce(new.target_value::text,'') <> coalesce(old.target_value::text,'') or coalesce(new.uom,'') <> coalesce(old.uom,'') or coalesce(new.thrust_area,'') <> coalesce(old.thrust_area,'')) then
      if current_setting('app.allow_shared_update', true) <> 'true' then
        raise exception 'Cannot modify shared goal fields; only the shared goal owner may update these.';
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_shared_field_change on goals;
create trigger trg_prevent_shared_field_change
before update on goals
for each row execute procedure prevent_shared_field_change();

-- Trigger to audit goal changes after a goal is locked
create or replace function audit_goal_changes_after_lock() returns trigger as $$
declare
  diffs jsonb := '{}'::jsonb;
begin
  if old.locked is true then
    -- compute simple diff between old and new
    diffs := (row_to_json(new) :: jsonb) - (row_to_json(old) :: jsonb) ;
    if diffs = '{}'::jsonb then
      return new;
    end if;
    insert into audit_logs(user_id, action, module, metadata) values (null, 'goal_changed_after_lock', 'goals', jsonb_build_object('goal_id', old.id, 'diff', diffs));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_audit_goal_changes on goals;
create trigger trg_audit_goal_changes
after update on goals
for each row execute function audit_goal_changes_after_lock();

-- Cycles table: define windows for checkins/goals to enforce schedule windows
create table if not exists cycles (
  id uuid default gen_random_uuid() primary key,
  name text,
  cycle_type text not null,
  quarter text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz default now()
);

-- helper: current quarter
create or replace function get_current_quarter() returns text language sql immutable as $$
  select case
    when extract(month from now()) <= 3 then 'Q1'
    when extract(month from now()) <= 6 then 'Q2'
    when extract(month from now()) <= 9 then 'Q3'
    else 'Q4' end;
$$;

-- RPC: check whether a checkin for given quarter may be submitted now
create or replace function can_submit_checkin(p_quarter text) returns boolean language plpgsql security definer as $$
begin
  if p_quarter = get_current_quarter() then
    return true;
  end if;

  if exists (
    select 1 from cycles c
    where c.cycle_type = 'checkin'
      and c.quarter = p_quarter
      and now() between c.start_date and c.end_date
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- trigger to enforce checkin cycles at DB level
create or replace function enforce_checkin_cycle() returns trigger language plpgsql as $$
begin
  if not can_submit_checkin(new.quarter) then
    raise exception 'Check-ins for % are not allowed at this time', new.quarter;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_checkin_cycle on checkins;
create trigger trg_enforce_checkin_cycle
before insert on checkins
for each row execute function enforce_checkin_cycle();

