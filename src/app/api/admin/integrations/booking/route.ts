import { NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { environment } from "@/lib/config/environment";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["manager", "owner", "super_admin"].includes(role))) return NextResponse.json({ ok: false }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration is unavailable." }, { status: 503 });
  const [{ data: latestSuccess }, { data: latestFailure }, { count: retryCount }] = await Promise.all([
    admin.from("formsubmit_deliveries").select("sent_at,updated_at").eq("status", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("formsubmit_deliveries").select("status,last_error,updated_at").in("status", ["failed", "awaiting_activation", "retrying"]).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("formsubmit_deliveries").select("id", { count: "exact", head: true }).in("status", ["queued", "failed", "retrying", "awaiting_activation"]),
  ]);
  const formSubmitConfigured = process.env.FORMSUBMIT_ENABLED !== "false" && Boolean(process.env.FORMSUBMIT_RECIPIENT_EMAIL || process.env.INITIAL_OWNER_EMAIL);
  const formSubmitStatus = !formSubmitConfigured ? "not_configured" : latestSuccess?.sent_at ? "active" : latestFailure?.status === "awaiting_activation" ? "awaiting_activation" : latestFailure ? "delivery_failed" : "configured";
  return NextResponse.json({ ok: true, providers: { supabase: { configured: environment.supabaseConfigured, adminConfigured: environment.supabaseAdminConfigured }, formsubmit: { configured: formSubmitConfigured, status: formSubmitStatus, lastSuccessfulSubmission: latestSuccess?.sent_at ?? null, lastFailedSubmission: latestFailure?.updated_at ?? null, retryCount: retryCount ?? 0 }, resend: { configured: environment.emailConfigured }, square: { configured: environment.squareConfigured, status: environment.squareConfigured ? "configured" : "optional_not_connected" } } }, { headers: { "cache-control": "private, no-store" } });
}
