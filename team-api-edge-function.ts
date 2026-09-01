// ============================================================================
// PHASE 2b — Edge Function: team-api
// ============================================================================
// Handles the two Team Management actions that genuinely need Supabase's
// admin-level API (creating a real login, resetting a real password) —
// these require the service-role key, which must never reach the browser,
// even for a legitimately signed-in Owner/Manager. Every other Team
// Management action (block/unblock, edit permissions, edit specialty) does
// NOT need this function — those work directly from the admin dashboard
// using the signed-in staff member's own session, protected by the RLS
// policies from Phase 1.
//
// SECURITY NOTE: this function still checks — using the CALLER's own
// identity, taken from their Authorization header — that they're actually
// allowed to do what they're asking. It does not trust the browser's
// word for who's asking; it asks the database, the same way Phase 1's
// policies do, just via RPC since this runs outside a normal RLS context.
//
// DEPLOY THE SAME WAY AS booking-api:
//   1. Edge Functions → Deploy a new function → "Via Editor"
//   2. Name it exactly: team-api
//   3. Clear the starter code, paste this file in (use the Notepad trick
//      from before if you hit the same parsing error)
//   4. Deploy
//   5. Send me the resulting URL
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

function genTempPassword() {
  return Math.random().toString(36).slice(2, 8) + "-" + Math.random().toString(36).slice(2, 8);
}

// Builds a client that acts AS the calling browser's signed-in user, so
// auth.uid() and RLS work exactly as if they'd called the database
// directly — this is how we check "is this really allowed", not by
// trusting anything the request body claims.
function callerClient(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  return createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
}

// ---------------------------------------------------------------------------
async function createTeamMember(req: Request, body: any) {
  const sbCaller = callerClient(req);
  const { data: { user } } = await sbCaller.auth.getUser();
  if (!user) return json({ ok: false, message: "Not signed in." }, 401);

  const { data: caller } = await sbCaller.from("team_accounts").select("*").eq("id", user.id).maybeSingle();
  if (!caller || caller.status === "blocked") return json({ ok: false, message: "Not authorized." }, 403);
  if (caller.role !== "owner" && caller.role !== "manager") return json({ ok: false, message: "Not authorized." }, 403);

  const { name, username, phone, role, assigned_specialist_id, specialty } = body;
  if (!name || !username || !role) return json({ ok: false, message: "Missing required fields." }, 400);
  if (role === "owner") return json({ ok: false, message: "Cannot create another Owner account." }, 400);
  if (caller.role === "manager" && role === "manager") {
    return json({ ok: false, message: "Managers can create Receptionist and Staff accounts, not other Managers." }, 403);
  }

  const tempPassword = genTempPassword();
  const { data: newUser, error: createErr } = await sbAdmin.auth.admin.createUser({
    email: username, password: tempPassword, email_confirm: true,
  });
  if (createErr || !newUser?.user) return json({ ok: false, message: createErr?.message || "Could not create login." }, 400);

  const { error: insertErr } = await sbAdmin.from("team_accounts").insert({
    id: newUser.user.id, name, username, phone: phone || "", role, status: "active",
    assigned_specialist_id: assigned_specialist_id || null, specialty: specialty || null,
    permission_overrides: { categories: [], flags: [] },
  });
  if (insertErr) {
    // roll back the auth user if the profile row failed, so we don't leave an orphaned login
    await sbAdmin.auth.admin.deleteUser(newUser.user.id);
    return json({ ok: false, message: insertErr.message }, 400);
  }

  return json({ ok: true, temp_password: tempPassword });
}

// ---------------------------------------------------------------------------
async function resetPassword(req: Request, body: any) {
  const sbCaller = callerClient(req);
  const { data: { user } } = await sbCaller.auth.getUser();
  if (!user) return json({ ok: false, message: "Not signed in." }, 401);

  const { target_id } = body;
  if (!target_id) return json({ ok: false, message: "Missing target." }, 400);

  const { data: canManage } = await sbCaller.rpc("can_manage_team_member", { target_id });
  if (!canManage) return json({ ok: false, message: "Not authorized to reset this account's password." }, 403);

  const tempPassword = genTempPassword();
  const { error } = await sbAdmin.auth.admin.updateUserById(target_id, { password: tempPassword });
  if (error) return json({ ok: false, message: error.message }, 400);

  return json({ ok: true, temp_password: tempPassword });
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
    case "create_team_member": return await createTeamMember(req, body);
    case "reset_password": return await resetPassword(req, body);
    default: return json({ ok: false, message: "Unknown action." }, 400);
  }
});
