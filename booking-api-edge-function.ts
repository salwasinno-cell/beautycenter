// ============================================================================
// PHASE 2 — Edge Function: booking-api
// ============================================================================
// This is the "gatekeeper" for everything a CUSTOMER does that writes data
// (create a booking, cancel their own, reschedule their own, join a
// waitlist, look up their own upcoming appointments by phone). Customers
// never log in, so the browser has no real session — this function runs
// with the SERVICE ROLE key (full database access) but only ever does what
// its own code allows, which is exactly these five narrow actions, each
// re-validated here regardless of what the browser claims.
//
// Staff/admin actions (cancel on behalf of a customer, mark complete,
// manage services, etc.) do NOT go through this function — they go
// through the normal Supabase client using the staff member's own signed-in
// session, enforced by the RLS policies from Phase 1. This function is
// ONLY for the no-login customer path.
//
// HOW TO DEPLOY (no coding tools needed, everything in the dashboard):
//   1. Supabase dashboard → left sidebar → "Edge Functions"
//   2. Click "Create a new function" (or "Deploy a new function")
//   3. Name it exactly: booking-api
//   4. Delete any starter/template code in the editor
//   5. Paste this entire file in its place
//   6. Click "Deploy"
//   7. Once deployed, click on the function → copy its URL (looks like
//      https://possqyvufrubfixipwlm.supabase.co/functions/v1/booking-api)
//      — send me that URL so I can wire it into the site code in Phase 3.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function digitsOnly(phone: string) {
  return (phone || "").replace(/\D/g, "");
}
function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// True if the [startTime, endTime) appointment window overlaps the
// configured daily break at all — mirrors the same rule the customer site
// and admin already apply client-side, re-checked here so it can't be
// bypassed by calling this API directly.
function overlapsBreak(startTime: string, endTime: string, breakStart: string, breakDurationMinutes: number) {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const apptStart = toMin(startTime), apptEnd = toMin(endTime);
  const brkStart = toMin(breakStart), brkEnd = brkStart + (breakDurationMinutes || 60);
  return apptStart < brkEnd && apptEnd > brkStart;
}

async function getBusinessSettings() {
  const { data } = await sb.from("business_settings").select("*").eq("id", 1).maybeSingle();
  return data || { booking_lead_hours: 2, default_buffer_minutes: 15, max_active_bookings_per_phone: 3 };
}

async function pushNotification(phone: string | null, type: string, message: string, apptId: string | null) {
  await sb.from("notifications").insert({ phone, type, message, appt_id: apptId, status: "sent" });
}

async function notifyWaitlist(date: string, specialistId: string | null) {
  const { data: entries } = await sb.from("waitlist").select("*").eq("waitlist_date", date).eq("specialist_id", specialistId);
  if (!entries || !entries.length) return;
  for (const e of entries) {
    await pushNotification(e.phone, "waitlist", `Good news — an opening just came up on ${date} for ${e.treatment || "your requested service"}. Book quickly, it's first come, first served.`, null);
  }
  await sb.from("waitlist").delete().eq("waitlist_date", date).eq("specialist_id", specialistId);
}

// ---------------------------------------------------------------------------
async function createBooking(body: any) {
  const { service_id, specialist_id, date, time, name, phone, email, notes, deposit } = body;
  if (!service_id || !date || !time || !name || !phone) {
    return json({ ok: false, reason: "invalid", message: "Missing required fields." }, 400);
  }

  const settings = await getBusinessSettings();

  // Lead time check
  const apptDateTime = new Date(`${date}T${time}:00`);
  const hoursUntil = (apptDateTime.getTime() - Date.now()) / 3600000;
  if (hoursUntil < settings.booking_lead_hours) {
    return json({ ok: false, reason: "lead-time" });
  }

  // Look up the REAL service details server-side — never trust duration/price from the browser
  const { data: service, error: svcErr } = await sb.from("services").select("*").eq("id", service_id).maybeSingle();
  if (svcErr || !service) return json({ ok: false, reason: "invalid", message: "Service not found." }, 400);

  // Holiday check
  const { data: holiday } = await sb.from("holidays").select("*").eq("date", date).maybeSingle();
  if (holiday) return json({ ok: false, reason: "taken", message: `Closed — ${holiday.label}.` });

  // Specialist working-day/vacation check
  if (specialist_id) {
    const { data: sp } = await sb.from("specialists").select("*").eq("id", specialist_id).maybeSingle();
    if (sp) {
      const dow = new Date(`${date}T00:00:00`).getDay();
      if (sp.working_days && !sp.working_days.includes(dow)) return json({ ok: false, reason: "taken", message: "Specialist not working that day." });
      if ((sp.vacation_dates || []).includes(date)) return json({ ok: false, reason: "taken", message: "Specialist on vacation that day." });
    }
  }

  // Booking-limit check (active bookings per phone)
  const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).eq("customer_phone", phone).eq("status", "confirmed");
  if ((count || 0) >= settings.max_active_bookings_per_phone) {
    return json({ ok: false, reason: "limit" });
  }

  const buffer = service.buffer_minutes ?? settings.default_buffer_minutes;
  const endTime = addMinutes(time, service.duration_minutes + buffer);

  // Daily break check — re-validated server-side so it can't be bypassed by
  // calling this API directly, same principle as every other rule here.
  if (settings.break_enabled && overlapsBreak(time, endTime, settings.break_start, settings.break_duration_minutes)) {
    return json({ ok: false, reason: "taken", message: "That time falls within our daily break — please choose a time outside it." });
  }

  const id = newId("APT");

  // Upsert the customer profile
  await sb.from("customers").upsert({ phone, name, email: email || "", updated_at: new Date().toISOString() }, { onConflict: "phone" });

  // The actual insert — Postgres's exclusion constraint (Phase 1) is what
  // makes this genuinely safe against two simultaneous bookings, not this
  // JavaScript. If someone else grabbed the slot a moment ago, this insert
  // itself fails with error code 23P01 and we report it cleanly.
  const { error: insertErr } = await sb.from("bookings").insert({
    id, booking_date: date, start_time: time, end_time: endTime,
    specialist_id: specialist_id || null, service_id, treatment_name: service.name,
    customer_phone: phone, customer_name: name, customer_email: email || "",
    notes: notes || "", deposit: !!deposit, status: "confirmed", created_by: "customer",
  });

  if (insertErr) {
    if (insertErr.code === "23P01") return json({ ok: false, reason: "taken" });
    return json({ ok: false, reason: "invalid", message: insertErr.message }, 400);
  }

  await pushNotification(phone, "confirmation", `Your appointment for ${service.name} is confirmed for ${date} at ${time}.`, id);
  await pushNotification(null, "admin-alert", `New booking: ${name} — ${service.name} on ${date} at ${time}.`, id);

  return json({ ok: true, booking_id: id });
}

// ---------------------------------------------------------------------------
async function cancelBooking(body: any) {
  const { booking_id, phone } = body;
  if (!booking_id || !phone) return json({ ok: false, message: "Missing fields." }, 400);

  const { data: booking } = await sb.from("bookings").select("*").eq("id", booking_id).maybeSingle();
  if (!booking) return json({ ok: false, message: "Not found." }, 404);
  if (digitsOnly(booking.customer_phone) !== digitsOnly(phone)) {
    return json({ ok: false, message: "This appointment does not belong to that phone number." }, 403);
  }
  if (booking.status === "cancelled") return json({ ok: false, already: true });

  const { error } = await sb.from("bookings").update({
    status: "cancelled", cancelled_by: "customer", cancelled_at: new Date().toISOString(),
    audit_log: [...(booking.audit_log || []), { action: "cancelled", by: "customer", at: new Date().toISOString() }],
  }).eq("id", booking_id);
  if (error) return json({ ok: false, message: error.message }, 400);

  await pushNotification(booking.customer_phone, "cancellation", `Your appointment for ${booking.treatment_name} on ${booking.booking_date} at ${booking.start_time} has been cancelled.`, booking_id);
  await pushNotification(null, "admin-alert", `${booking.customer_name} cancelled the ${booking.booking_date} ${booking.start_time} appointment for ${booking.treatment_name}.`, booking_id);
  await notifyWaitlist(booking.booking_date, booking.specialist_id);

  return json({ ok: true });
}

// ---------------------------------------------------------------------------
async function rescheduleBooking(body: any) {
  const { booking_id, phone, new_date, new_time } = body;
  if (!booking_id || !phone || !new_date || !new_time) return json({ ok: false, message: "Missing fields." }, 400);

  const { data: booking } = await sb.from("bookings").select("*").eq("id", booking_id).maybeSingle();
  if (!booking) return json({ ok: false, message: "Not found." }, 404);
  if (digitsOnly(booking.customer_phone) !== digitsOnly(phone)) {
    return json({ ok: false, message: "This appointment does not belong to that phone number." }, 403);
  }
  if (booking.status !== "confirmed") return json({ ok: false, message: "This appointment can no longer be rescheduled." }, 400);

  const settings = await getBusinessSettings();
  const newDateTime = new Date(`${new_date}T${new_time}:00`);
  if ((newDateTime.getTime() - Date.now()) / 3600000 < settings.booking_lead_hours) {
    return json({ ok: false, reason: "lead-time" });
  }

  const { data: service } = await sb.from("services").select("*").eq("id", booking.service_id).maybeSingle();
  const buffer = service?.buffer_minutes ?? settings.default_buffer_minutes;
  const duration = service ? service.duration_minutes : 30;
  const newEnd = addMinutes(new_time, duration + buffer);

  if (settings.break_enabled && overlapsBreak(new_time, newEnd, settings.break_start, settings.break_duration_minutes)) {
    return json({ ok: false, message: "That time falls within our daily break — please choose a time outside it." });
  }

  const oldDate = booking.booking_date, oldTime = booking.start_time;
  const { error } = await sb.from("bookings").update({
    booking_date: new_date, start_time: new_time, end_time: newEnd,
    reminder_sent: false, same_day_reminder_sent: false,
    audit_log: [...(booking.audit_log || []), { action: "rescheduled", by: "customer", at: new Date().toISOString(), from: `${oldDate} ${oldTime}`, to: `${new_date} ${new_time}` }],
  }).eq("id", booking_id);

  if (error) {
    if (error.code === "23P01") return json({ ok: false, reason: "taken" });
    return json({ ok: false, message: error.message }, 400);
  }

  await pushNotification(booking.customer_phone, "reschedule", `Your appointment for ${booking.treatment_name} has been moved to ${new_date} at ${new_time}.`, booking_id);
  await pushNotification(null, "admin-alert", `${booking.customer_name} rescheduled the ${oldDate} ${oldTime} appointment to ${new_date} ${new_time}.`, booking_id);
  await notifyWaitlist(oldDate, booking.specialist_id);

  return json({ ok: true });
}

// ---------------------------------------------------------------------------
async function joinWaitlist(body: any) {
  const { date, specialist_id, phone, name, treatment } = body;
  if (!date || !phone) return json({ ok: false, message: "Missing fields." }, 400);
  const { error } = await sb.from("waitlist").insert({ waitlist_date: date, specialist_id: specialist_id || null, phone, name: name || "", treatment: treatment || "" });
  if (error) return json({ ok: false, message: error.message }, 400);
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
async function lookupByPhone(body: any) {
  const { phone } = body;
  if (!phone) return json({ ok: false, message: "Missing phone." }, 400);
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("bookings")
    .select("id, treatment_name, booking_date, start_time, status")
    .eq("customer_phone", phone)
    .eq("status", "confirmed")
    .gte("booking_date", today)
    .order("booking_date", { ascending: true });
  if (error) return json({ ok: false, message: error.message }, 400);
  return json({ ok: true, bookings: data });
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, message: "POST only." }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON." }, 400);
  }

  switch (body.action) {
    case "create_booking": return await createBooking(body);
    case "cancel_booking": return await cancelBooking(body);
    case "reschedule_booking": return await rescheduleBooking(body);
    case "join_waitlist": return await joinWaitlist(body);
    case "lookup_by_phone": return await lookupByPhone(body);
    default: return json({ ok: false, message: "Unknown action." }, 400);
  }
});
