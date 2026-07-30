import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  preferredLanguage: z.enum(["en", "es"]).optional(),
  groomingPreferences: z.record(z.string(), z.union([z.string().max(300), z.boolean(), z.number()])).optional(),
  marketingStatus: z.enum(["unknown", "subscribed", "unsubscribed"]).optional(),
});

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  return supabase ? { session, supabase } : null;
}

export async function GET() {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const [profile, client] = await Promise.all([
    value.supabase.from("profiles").select("full_name,display_name,phone,preferred_language,status").eq("id", value.session.user.id).maybeSingle(),
    value.supabase.from("client_profiles").select("favorite_barber_id,grooming_preferences,marketing_status").eq("user_id", value.session.user.id).maybeSingle(),
  ]);
  return NextResponse.json({ ok: true, email: value.session.user.email, profile: profile.data, client: client.data });
}

export async function PATCH(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the profile information and try again." }, { status: 400 });
  const profileUpdate: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) profileUpdate.full_name = parsed.data.fullName;
  if (parsed.data.phone !== undefined) profileUpdate.phone = parsed.data.phone || null;
  if (parsed.data.preferredLanguage !== undefined) profileUpdate.preferred_language = parsed.data.preferredLanguage;
  if (Object.keys(profileUpdate).length) {
    const { error } = await value.supabase.from("profiles").update(profileUpdate).eq("id", value.session.user.id);
    if (error) return NextResponse.json({ ok: false, message: "Profile details could not be updated." }, { status: 500 });
  }
  const clientUpdate: Record<string, unknown> = {};
  if (parsed.data.groomingPreferences !== undefined) clientUpdate.grooming_preferences = parsed.data.groomingPreferences;
  if (parsed.data.marketingStatus !== undefined) clientUpdate.marketing_status = parsed.data.marketingStatus;
  if (Object.keys(clientUpdate).length) {
    const { error } = await value.supabase.from("client_profiles").update(clientUpdate).eq("user_id", value.session.user.id);
    if (error) return NextResponse.json({ ok: false, message: "Client preferences could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
