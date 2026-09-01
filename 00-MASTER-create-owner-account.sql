-- ============================================================================
-- MASTER — Create the Owner account (run once per new client, after
-- 00-MASTER-schema.sql)
-- ============================================================================
-- STEP A — create the real login first, in the dashboard (not SQL):
--   Authentication → Users → Add user → Create new user
--   Enter the client's real email + a strong password, check
--   "Auto Confirm User" → Create user → click the new user → copy the
--   "User UID" shown on their page.
--
-- STEP B — paste that UID below, update the name/email to match, then run
-- this whole file in the SQL Editor.
-- ============================================================================

insert into team_accounts (id, name, username, role, status)
values (
  'PASTE_USER_UID_HERE',      -- from Authentication → Users
  'Owner',                     -- change to the real owner's name if you like
  'owner@example.com',         -- must exactly match the email used in Step A
  'owner',
  'active'
);

-- That's it — this is now the one real Owner account. Every other team
-- member (Manager, Receptionist, Staff) gets created the same two-step way
-- from now on: a real Auth user, then a matching team_accounts row — or,
-- once logged in, the Owner can create them directly from the Team
-- Management screen in admin, which handles both steps automatically.
