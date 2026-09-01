-- Adds a real, admin-configurable daily break (e.g. lunch) that the admin
-- can turn on/off, and set the start time and duration for, at any time.
-- Replaces the old hardcoded 11:30-13:00 / 15:30-16:30 gaps that were
-- baked into the code with no admin control at all.

alter table business_settings
  add column if not exists break_enabled boolean not null default false,
  add column if not exists break_start time not null default '13:00',
  add column if not exists break_duration_minutes integer not null default 60;
