-- ============================================================================
-- MASTER SCHEMA — run this ONCE, in full, on a brand-new Supabase project
-- ============================================================================
-- This is the consolidated result of everything built and fixed across the
-- Queens/LUMÉ build (previously spread across 9 separate incremental SQL
-- files). For a new client, this single file replaces all of them — you
-- do not need to run 01 through 09 individually, just this one.
--
-- What this creates: the full relational schema, real double-booking
-- prevention (a Postgres exclusion constraint, not application code), all
-- Row Level Security policies, the reminder scheduler, and the editable
-- Business Settings + Email Templates tables — all seeded with GENERIC
-- placeholder content, not any specific client's branding or services.
--
-- After this file, you still need to (see the onboarding checklist):
--   1. Create the real Owner login (Authentication → Users), then run
--      the separate "create-owner-account.sql" with that user's UID.
--   2. Deploy the three Edge Functions (booking-api, team-api,
--      send-notification-email).
--   3. Set the RESEND_API_KEY secret and connect the notifications webhook.
--   4. Point the two HTML files at this project's URL/key.
--   5. Fill in real Business Settings from the admin dashboard.
-- ============================================================================

-- ============================================================================
-- PART 1 — Core lookup & catalog tables
-- ============================================================================

create table if not exists categories (
  id text primary key,
  name text not null
);

create table if not exists services (
  id text primary key,
  category_id text not null references categories(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration_minutes int not null,
  description text default '',
  image_url text default '',
  online_bookable boolean not null default true,
  deposit_required boolean not null default false,
  prep_minutes int not null default 0,
  buffer_minutes int  -- null = use the business's default buffer
);

create table if not exists specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text default '',
  capable_categories text[] not null default '{}',
  working_days int[] not null default '{1,2,3,4,5,6}',   -- 0=Sun..6=Sat
  vacation_dates date[] not null default '{}'
);

create table if not exists holidays (
  date date primary key,
  label text not null
);

-- ============================================================================
-- PART 2 — Team accounts (linked to real Supabase Auth users)
-- ============================================================================

do $$ begin
  create type team_role as enum ('owner','manager','receptionist','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active','blocked');
exception when duplicate_object then null; end $$;

create table if not exists team_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null,   -- the email used to sign in
  phone text default '',
  role team_role not null,
  status account_status not null default 'active',
  assigned_specialist_id uuid references specialists(id),
  specialty text references categories(id),
  permission_overrides jsonb not null default '{"categories":[],"flags":[]}'::jsonb,
  last_login timestamptz
);

-- ============================================================================
-- PART 3 — Customers & Bookings
-- ============================================================================

create table if not exists customers (
  phone text primary key,
  name text default '',
  email text default '',
  dob date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type booking_status as enum ('confirmed','held','cancelled','completed','no-show','blocked');
exception when duplicate_object then null; end $$;

create table if not exists bookings (
  id text primary key,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  specialist_id uuid references specialists(id),
  service_id text references services(id),
  treatment_name text,
  customer_phone text,
  customer_name text,
  customer_email text default '',
  notes text default '',
  deposit boolean not null default false,
  status booking_status not null default 'confirmed',
  hold_token text,
  hold_expires_at timestamptz,
  reminder_sent boolean not null default false,
  same_day_reminder_sent boolean not null default false,
  created_by text,   -- 'customer', or a staff username
  created_at timestamptz not null default now(),
  cancelled_by text,
  cancelled_at timestamptz,
  rescheduled_from text,
  audit_log jsonb not null default '[]'::jsonb,

  -- THE key safety guarantee: makes it physically impossible in Postgres
  -- for the same specialist to hold two overlapping confirmed/held
  -- bookings — not a JavaScript check that can race, a database rule.
  exclude using gist (
    specialist_id with =,
    booking_date with =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp
    ) with &&
  ) where (status in ('confirmed','held'))
);

create table if not exists notifications (
  id bigserial primary key,
  phone text,
  type text not null,
  message text not null,
  appt_id text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create table if not exists waitlist (
  id bigserial primary key,
  waitlist_date date not null,
  specialist_id uuid references specialists(id),
  phone text not null,
  name text default '',
  treatment text default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PART 4 — Business Settings (single row, id=1) — GENERIC seed, no client
-- branding baked in
-- ============================================================================

create table if not exists business_settings (
  id int primary key default 1 check (id = 1),

  business_name text not null default 'Your Business Name',
  tagline text default '',
  logo_url text default '',

  address text default '',
  phone text default '',
  email text default '',
  whatsapp_number text default '',
  instagram_url text default '',
  facebook_url text default '',

  hero_eyebrow text default 'Book Your Appointment',
  hero_line1 text default 'YOUR',
  hero_line2 text default 'BUSINESS',
  hero_subtitle text default '',
  about_title text default 'About us',
  about_body_1 text default '',
  about_body_2 text default '',
  about_signature text default '',

  visit_info jsonb not null default '[]'::jsonb,
  hours_display text default '',

  default_language text not null default 'en' check (default_language in ('en','ar')),
  currency_symbol text default '$',
  timezone text default 'UTC',

  booking_lead_hours int not null default 2,
  default_buffer_minutes int not null default 15,
  max_active_bookings_per_phone int not null default 3,
  hold_minutes int not null default 7,

  reminder_hours_before int not null default 24,
  same_day_reminder_hours_before int not null default 3,

  color_primary text default '',
  color_accent text default '',

  updated_at timestamptz not null default now()
);

insert into business_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- PART 5 — Email Templates (admin-editable wording for 5 email types)
-- ============================================================================

create table if not exists email_templates (
  type text primary key,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

insert into email_templates (type, subject, body) values
('confirmation', 'Your appointment is confirmed, {{name}}',
 'Hi {{name}},

Your appointment is confirmed:

Service: {{service}}
Specialist: {{specialist}}
Date: {{date}}
Time: {{time}}
Price: {{price}}

We look forward to your visit.

— {{business_name}}
{{address}}
{{phone}}'),
('cancellation', 'Your appointment has been cancelled',
 'Hi {{name}},

Your appointment has been cancelled:

Service: {{service}}
Specialist: {{specialist}}
Date: {{date}}
Time: {{time}}

If this wasn''t intentional, or you''d like to rebook, just get in touch.

— {{business_name}}
{{address}}
{{phone}}'),
('reschedule', 'Your appointment has been rescheduled',
 'Hi {{name}},

Your appointment has been moved to:

Service: {{service}}
Specialist: {{specialist}}
New Date: {{date}}
New Time: {{time}}

We look forward to seeing you then.

— {{business_name}}
{{address}}
{{phone}}'),
('reminder', 'Reminder: your appointment is coming up',
 'Hi {{name}},

Just a reminder — your appointment is coming up:

Service: {{service}}
Specialist: {{specialist}}
Date: {{date}}
Time: {{time}}

We look forward to seeing you.

— {{business_name}}
{{address}}
{{phone}}'),
('reminder-same-day', 'Reminder: your appointment is today',
 'Hi {{name}},

Just a reminder — your appointment is later today:

Service: {{service}}
Specialist: {{specialist}}
Time: {{time}}

We look forward to seeing you shortly.

— {{business_name}}
{{address}}
{{phone}}')
on conflict (type) do nothing;

-- ============================================================================
-- PART 6 — Helper functions (used by RLS policies below)
-- ============================================================================

create or replace function current_team_member()
returns team_accounts
language sql security definer stable
as $$
  select * from team_accounts where id = auth.uid();
$$;

create or replace function has_permission(perm text)
returns boolean
language plpgsql security definer stable
as $$
declare
  member team_accounts;
  role_perms text[];
begin
  select * into member from team_accounts where id = auth.uid();
  if member.id is null or member.status = 'blocked' then return false; end if;

  role_perms := case member.role
    when 'owner' then array['viewAll','manageAppointmentsAll','manageAppointmentsOwn','manageCustomers','manageServices','manageTeamAll','manageTeamStaffOnly','resetAnyPassword','viewAnalytics','manageSettings']
    when 'manager' then array['viewAll','manageAppointmentsAll','manageAppointmentsOwn','manageCustomers','manageServices','manageTeamStaffOnly','viewAnalytics','manageSettings']
    when 'receptionist' then array['viewAll','manageAppointmentsAll','manageAppointmentsOwn','manageCustomers']
    when 'staff' then array['viewOwnScheduleAndCalendar','manageAppointmentsOwn']
    else array[]::text[]
  end;

  if perm = any(role_perms) then return true; end if;
  return (member.permission_overrides->'flags') ? perm;
end;
$$;

create or replace function can_manage_service_category(target_service_id text)
returns boolean
language plpgsql security definer stable
as $$
declare
  member team_accounts;
  cat text;
begin
  if has_permission('manageAppointmentsAll') then return true; end if;
  select * into member from team_accounts where id = auth.uid();
  if member.id is null then return false; end if;
  select category_id into cat from services where id = target_service_id;
  if cat is null then return false; end if;
  if member.specialty = cat then return true; end if;
  return (member.permission_overrides->'categories') ? cat;
end;
$$;

create or replace function can_manage_team_member(target_id uuid)
returns boolean
language plpgsql security definer stable
as $$
declare
  caller team_accounts;
  target team_accounts;
begin
  select * into caller from team_accounts where id = auth.uid();
  select * into target from team_accounts where id = target_id;
  if caller.id is null or target.id is null then return false; end if;
  if caller.role = 'owner' then return target.role <> 'owner' or target.id = caller.id; end if;
  if caller.role = 'manager' then return target.role not in ('owner','manager'); end if;
  return false;
end;
$$;

-- ============================================================================
-- PART 7 — Row Level Security: enable + policies for every table
-- ============================================================================

alter table categories enable row level security;
alter table services enable row level security;
alter table specialists enable row level security;
alter table holidays enable row level security;
alter table team_accounts enable row level security;
alter table customers enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
alter table waitlist enable row level security;
alter table business_settings enable row level security;
alter table email_templates enable row level security;

-- Catalog: public read, staff-managed write
create policy "categories read" on categories for select using (true);
create policy "categories write" on categories for all using (has_permission('manageSettings')) with check (has_permission('manageSettings'));
create policy "services read" on services for select using (true);
create policy "services write" on services for all using (has_permission('manageSettings')) with check (has_permission('manageSettings'));
create policy "specialists read" on specialists for select using (true);
create policy "specialists write" on specialists for all using (has_permission('manageSettings')) with check (has_permission('manageSettings'));
create policy "holidays read" on holidays for select using (true);
create policy "holidays write" on holidays for all using (has_permission('manageSettings')) with check (has_permission('manageSettings'));

-- Business Settings & Email Templates: public read (site needs it to
-- render), staff-managed write
create policy "business settings read" on business_settings for select using (true);
create policy "business settings write" on business_settings for update using (has_permission('manageSettings')) with check (has_permission('manageSettings'));
create policy "email templates staff manage" on email_templates for all using (has_permission('manageSettings')) with check (has_permission('manageSettings'));

-- Team accounts: self-readable + hierarchy-managed; no public access
create policy "team self read" on team_accounts for select using (id = auth.uid() or can_manage_team_member(id));
create policy "team managed update" on team_accounts for update using (can_manage_team_member(id)) with check (can_manage_team_member(id));

-- Customers: staff-only, gated by manageCustomers
create policy "customers staff read" on customers for select using (has_permission('manageCustomers'));
create policy "customers staff write" on customers for all using (has_permission('manageCustomers')) with check (has_permission('manageCustomers'));

-- Bookings: staff read/update scoped to their permitted categories;
-- customer-facing writes go through booking-api (service-role, bypasses RLS)
create policy "bookings staff read" on bookings for select using (has_permission('manageAppointmentsAll') or can_manage_service_category(service_id));
create policy "bookings staff update" on bookings for update using (can_manage_service_category(service_id)) with check (can_manage_service_category(service_id));
create policy "bookings staff insert" on bookings for insert with check (
  (status = 'blocked' and has_permission('manageSettings'))
  or (status <> 'blocked' and has_permission('manageAppointmentsAll'))
);

-- Notifications & waitlist: staff-only read; any signed-in staff member can
-- log a notification (admin-initiated actions write these directly)
create policy "notifications staff read" on notifications for select using (has_permission('viewAll'));
create policy "notifications staff insert" on notifications for insert with check (auth.uid() is not null);
create policy "waitlist staff read" on waitlist for select using (has_permission('viewAll'));

-- ============================================================================
-- PART 8 — public_availability RPC — the ONLY thing the anon key can call
-- against bookings; returns which time ranges are taken, never who booked
-- them
-- ============================================================================

create or replace function public_availability(p_date date, p_specialist_id uuid default null)
returns table (specialist_id uuid, start_time time, end_time time, status text)
language sql security definer stable
as $$
  select b.specialist_id, b.start_time, b.end_time, b.status
  from bookings b
  where b.booking_date = p_date
    and (p_specialist_id is null or b.specialist_id = p_specialist_id or b.specialist_id is null)
    and (b.status = 'confirmed' or b.status = 'blocked' or (b.status = 'held' and b.hold_expires_at > now()));
$$;
grant execute on function public_availability(date, uuid) to anon;

-- ============================================================================
-- PART 9 — Scheduled reminders (pg_cron)
-- ============================================================================

create extension if not exists pg_cron;

create or replace function send_due_reminders()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  hrs int;
  same_day_hrs int;
begin
  select reminder_hours_before, same_day_reminder_hours_before
    into hrs, same_day_hrs
    from business_settings where id = 1;
  hrs := coalesce(hrs, 24);
  same_day_hrs := coalesce(same_day_hrs, 3);

  with due as (
    update bookings
    set reminder_sent = true
    where status = 'confirmed'
      and reminder_sent = false
      and (booking_date + start_time) between (now() + make_interval(hours => hrs - 4)) and (now() + make_interval(hours => hrs + 4))
    returning id, customer_phone, treatment_name, booking_date, start_time
  )
  insert into notifications (phone, type, message, appt_id, status)
  select customer_phone, 'reminder',
    'Reminder: your appointment for ' || treatment_name || ' is coming up on ' || booking_date || ' at ' || to_char(start_time,'HH24:MI') || '.',
    id, 'sent'
  from due;

  with due_today as (
    update bookings
    set same_day_reminder_sent = true
    where status = 'confirmed'
      and same_day_reminder_sent = false
      and booking_date = current_date
      and (booking_date + start_time) between now() and (now() + make_interval(hours => same_day_hrs))
    returning id, customer_phone, treatment_name, booking_date, start_time
  )
  insert into notifications (phone, type, message, appt_id, status)
  select customer_phone, 'reminder-same-day',
    'Reminder: your appointment for ' || treatment_name || ' is today at ' || to_char(start_time,'HH24:MI') || '.',
    id, 'sent'
  from due_today;
end;
$$;

select cron.schedule('send-due-reminders', '*/15 * * * *', $$select send_due_reminders();$$);

-- ============================================================================
-- END OF MASTER SCHEMA.
-- Next: Authentication → Add user (the real Owner login), then run
-- create-owner-account.sql with that user's UID.
-- ============================================================================
