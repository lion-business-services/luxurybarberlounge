import "server-only";
import { createHash } from "node:crypto";
import { createUntypedAdminSupabase } from "./server";

function hashSensitive(value: string) {
  const pepper = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "luxury-barber-lounge-session-audit";
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

function requestMetadata(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  const userAgent = headers.get("user-agent") || "unknown";
  const deviceLabel = userAgent === "unknown" ? null : userAgent.slice(0, 120);
  return { ipHash: hashSensitive(ip), userAgentHash: hashSensitive(userAgent), deviceLabel };
}

export async function recordAuthenticatedSession(input: { userId: string; accessToken: string; headers: Headers }) {
  const admin = createUntypedAdminSupabase();
  if (!admin) return;
  const metadata = requestMetadata(input.headers);
  await admin.from("sessions_metadata").upsert({
    user_id: input.userId,
    session_hash: hashSensitive(input.accessToken),
    device_label: metadata.deviceLabel,
    ip_hash: metadata.ipHash,
    user_agent_hash: metadata.userAgentHash,
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
  }, { onConflict: "session_hash" });
}

export async function revokeAuthenticatedSession(accessToken: string | undefined) {
  const admin = createUntypedAdminSupabase();
  if (!admin || !accessToken) return;
  await admin.from("sessions_metadata").update({ revoked_at: new Date().toISOString() }).eq("session_hash", hashSensitive(accessToken)).is("revoked_at", null);
}

export async function revokeAllAuthenticatedSessions(userId: string | undefined) {
  const admin = createUntypedAdminSupabase();
  if (!admin || !userId) return;
  await admin.from("sessions_metadata").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).is("revoked_at", null);
}
