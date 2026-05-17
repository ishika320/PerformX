-- Sample data for PerformX (run after creating users in Supabase Auth)
-- Replace the example UUIDs with actual auth.user ids from your Supabase project.

-- Example: create three profiles (replace ids with real user ids)
insert into profiles (id, name, role, department, manager_id)
values
  ('00000000-0000-0000-0000-000000000001','Alice Employee','employee','Sales','00000000-0000-0000-0000-000000000003'),
  ('00000000-00000000-0000-0000-000000000002','Bob Employee','employee','Sales','00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000003','Carol Manager','manager','Sales',NULL),
  ('00000000-0000-0000-0000-000000000004','Diane Admin','admin','HR',NULL)
on conflict (id) do nothing;

-- Example goals (replace employee_id UUIDs to match profiles above)
insert into goals (employee_id, title, description, weightage, quarter, status, progress)
values
  ('00000000-0000-0000-0000-000000000001','Increase upsell rate','Drive upsell campaigns to existing customers',30,'Q2','approved',80),
  ('00000000-0000-0000-0000-000000000001','Improve onboarding','Reduce time-to-value for new customers',30,'Q2','submitted',40),
  ('00000000-0000-0000-0000-000000000002','Reduce churn','Identify churn risk and act',40,'Q2','draft',10)
;

-- Insert some audit logs
insert into audit_logs (user_id, action, module, metadata)
values
  ('00000000-0000-0000-0000-000000000001','create_goal','goals','{"title":"Increase upsell rate"}'),
  ('00000000-0000-0000-0000-000000000003','approve_goal','approvals', '{"goalId":"sample"}');

-- Notes:
-- 1) Create users via Supabase Auth first (Auth -> Users), copy their IDs into the script.
-- 2) Run this SQL in Supabase SQL editor to seed data.
