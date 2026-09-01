// ============================================================================
// send-notification-email — sends a REAL email via Resend whenever a row is
// inserted into the "notifications" table.
// ============================================================================
// Confirmation, Cancellation, Reschedule, Reminder, and Same-Day Reminder
// all use the admin-editable template from the "email_templates" table —
// real booking details get substituted into whatever wording the
// Owner/Manager has set, so rewording any of them never requires a code
// change or redeploy. Waitlist and Admin-Alert still use the plain message
// text for now (can be upgraded the same way later if wanted).
//
// TESTING NOTE: sends from Resend's shared sandbox address
// (onboarding@resend.dev), which can only deliver to the email address on
// your own Resend account — perfect for testing right now. Once you verify
// your own domain with Resend later, change RESEND_FROM below to a real
// address on that domain so it can email actual customers.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = "LUMÉ <onboarding@resend.dev>"; // change once your own domain is verified
const TEMPLATED_TYPES = ["confirmation", "cancellation", "reschedule", "reminder", "reminder-same-day"];

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUBJECTS: Record<string, string> = {
  confirmation: "Your appointment is confirmed",
  cancellation: "Your appointment has been cancelled",
  reschedule: "Your appointment has been rescheduled",
  reminder: "Reminder: your upcoming appointment",
  "reminder-same-day": "Reminder: your appointment today",
  waitlist: "A time just opened up",
  "admin-alert": "House alert",
};

function fillPlaceholders(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, text }),
  });
  if (!res.ok) console.error("Resend send failed:", res.status, await res.text());
}

// Builds any of the templated email types from the admin-editable wording +
// the real booking + business details — falls back to the plain
// notification message if anything's missing (deleted booking, no
// template saved yet, etc.).
async function buildTemplatedEmail(type: string, record: any, fallbackMessage: string) {
  const { data: template } = await sb.from("email_templates").select("*").eq("type", type).maybeSingle();
  if (!template || !record.appt_id) return { subject: SUBJECTS[type], body: fallbackMessage };

  const { data: booking } = await sb.from("bookings").select("*").eq("id", record.appt_id).maybeSingle();
  const { data: settings } = await sb.from("business_settings").select("*").eq("id", 1).maybeSingle();
  if (!booking) return { subject: SUBJECTS[type], body: fallbackMessage };

  let price = "";
  if (booking.service_id) {
    const { data: service } = await sb.from("services").select("price").eq("id", booking.service_id).maybeSingle();
    if (service) price = (settings?.currency_symbol || "$") + service.price;
  }
  let specialistName = "No Preference";
  if (booking.specialist_id) {
    const { data: sp } = await sb.from("specialists").select("name").eq("id", booking.specialist_id).maybeSingle();
    if (sp) specialistName = sp.name;
  }

  const values = {
    name: booking.customer_name || "",
    service: booking.treatment_name || "",
    specialist: specialistName,
    date: booking.booking_date || "",
    time: (booking.start_time || "").slice(0, 5),
    price,
    business_name: settings?.business_name || "",
    address: settings?.address || "",
    phone: settings?.phone || "",
  };

  return {
    subject: fillPlaceholders(template.subject, values),
    body: fillPlaceholders(template.body, values),
  };
}

Deno.serve(async (req) => {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = payload.record;
  if (!record) return new Response("No record in payload", { status: 400 });

  const { phone, type, message } = record;
  let recipientEmail: string | null = null;

  if (phone) {
    const { data: customer } = await sb.from("customers").select("email").eq("phone", phone).maybeSingle();
    recipientEmail = customer?.email || null;
  } else {
    const { data: settings } = await sb.from("business_settings").select("email").eq("id", 1).maybeSingle();
    recipientEmail = settings?.email || null;
  }

  if (!recipientEmail) {
    return new Response(JSON.stringify({ ok: true, skipped: "no email on file" }), { status: 200 });
  }

  let subject = SUBJECTS[type] || "Appointment update";
  let body = message;
  if (TEMPLATED_TYPES.includes(type)) {
    const built = await buildTemplatedEmail(type, record, message);
    subject = built.subject;
    body = built.body;
  }

  await sendEmail(recipientEmail, subject, body);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
