import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const bilingual = z.object({
  en: z.string().trim().max(2000).optional(),
  es: z.string().trim().max(2000).optional(),
});

const updateSchema = z.object({
  professionalTitle: bilingual.optional(),
  shortIntro: bilingual.optional(),
  biography: bilingual.optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  acceptingWalkIns: z.boolean().optional(),
  availabilityStatus: z.enum(["available", "busy", "unavailable"]).optional(),
});

/**
 * A barber's own profile. They may edit their presentation — title, intro,
 * biography, specialties, languages, walk-in willingness — but NOT commercial
 * or identity fields (slug, active, featured, portal_email, Square mapping),
 * which stay under owner control.
 */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) {
    return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const { data } = await admin
    .from("barber_profiles")
    .select("id,slug,display_name,professional_title,short_intro,biography,specialties,languages,accepting_walk_ins,availability_status,active,status,portal_email")
    .eq("staff_user_id", session.user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ ok: false, message: "No barber profile is linked to this account." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile: data });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) {
    return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Some fields were not valid." }, { status: 422 });
  }

  const { data: profile } = await admin
    .from("barber_profiles")
    .select("id")
    .eq("staff_user_id", session.user.id)
    .maybeSingle();
  if (!profile?.id) {
    return NextResponse.json({ ok: false, message: "No barber profile is linked to this account." }, { status: 404 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.professionalTitle) update.professional_title = parsed.data.professionalTitle;
  if (parsed.data.shortIntro) update.short_intro = parsed.data.shortIntro;
  if (parsed.data.biography) update.biography = parsed.data.biography;
  if (parsed.data.specialties) update.specialties = parsed.data.specialties;
  if (parsed.data.languages) update.languages = parsed.data.languages;
  if (parsed.data.acceptingWalkIns !== undefined) update.accepting_walk_ins = parsed.data.acceptingWalkIns;
  if (parsed.data.availabilityStatus) update.availability_status = parsed.data.availabilityStatus;

  const { error } = await admin.from("barber_profiles").update(update).eq("id", profile.id);
  if (error) {
    return NextResponse.json({ ok: false, message: "Your profile could not be saved." }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: session.user.id,
    action: "barber_profile_self_update",
    resource_type: "barber_profile",
    resource_id: profile.id,
    metadata: { fields: Object.keys(update).filter((key) => key !== "updated_at") },
  });

  return NextResponse.json({ ok: true, message: "Your profile has been updated." });
}
