-- Sample seed data for PerformX demo
-- NOTE: Replace placeholder UUIDs with real Supabase auth UIDs where indicated.
-- Replace the values <EMPLOYEE_UID>, <MANAGER_UID>, <ADMIN_UID> with actual auth UIDs.

-- Sample profiles
insert into profiles (id, name, role, department) values
('11111111-1111-1111-1111-111111111111', 'Alice Employee', 'employee', 'Engineering'),
('22222222-2222-2222-2222-222222222222', 'Bob Manager', 'manager', 'Engineering'),
('33333333-3333-3333-3333-333333333333', 'Carrie Admin', 'admin', 'HR');

-- Sample cycles (goal window open and a checkin window for Q1)
insert into cycles (id, name, cycle_type, quarter, start_date, end_date) values
(gen_random_uuid(), 'Goal Setting Phase 1', 'goal_window', 'Q1', '2026-05-01', '2026-05-31'),
(gen_random_uuid(), 'Q1 Checkin Window', 'checkin', 'Q1', '2026-07-01', '2026-07-31');

-- Sample goals for Alice (draft)
insert into goals (id, employee_id, thrust_area, uom, target_value, title, description, weightage, quarter, status)
values
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Sales', 'Numeric', 100, 'Increase Sales', 'Grow revenue by 20%', 50, 'Q1', 'draft'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Product', 'Numeric', 10, 'Improve NPS', 'Improve NPS by 10 points', 50, 'Q1', 'draft');

-- Create a submitted goal for testing approvals (simulate earlier submit)
insert into goals (id, employee_id, thrust_area, uom, target_value, title, description, weightage, quarter, status)
values
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Ops', 'Zero', 0, 'Zero incidents', 'Maintain zero safety incidents', 100, 'Q1', 'submitted');

-- Sample checkin (for completed goal)
insert into checkins (id, goal_id, employee_id, quarter, actual_value, status, comment)
select gen_random_uuid(), g.id, g.employee_id, 'Q1', 80, 'On Track', 'Progressing well' from goals g where g.title = 'Increase Sales' limit 1;

-- Sample approval and feedback
insert into approvals (id, goal_id, manager_id, decision, comment)
select gen_random_uuid(), g.id, '22222222-2222-2222-2222-222222222222', 'approve', 'Looks good' from goals g where g.status = 'submitted' limit 1;

insert into feedback_logs (id, goal_id, author_id, author_role, context, comment)
select gen_random_uuid(), g.id, '22222222-2222-2222-2222-222222222222', 'manager', 'approval', 'Approved after minor edits' from goals g where g.status = 'submitted' limit 1;

-- Notes:
-- If your auth UIDs differ, replace the profile IDs above with the actual user IDs from Supabase Auth.
-- Run this script in Supabase SQL editor after running `client/db/schema.sql` so dependent tables exist.
