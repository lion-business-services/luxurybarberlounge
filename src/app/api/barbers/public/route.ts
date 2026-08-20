import { NextResponse } from "next/server";
import { createUntypedAdminSupabase } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * Public barber roster for selection controls (membership signup, booking).
 * Returns only id and display name — never emails, user ids, or internal flags.
 */
export async function GET() {
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, barbers: [] });

  const { data } = await admin
    .from("barber_profiles")
    .select("id,display_name,sort_order")
    .eq("active", true)
    .eq("demo", false)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  return NextResponse.json({
    ok: true,
    barbers: (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.display_name),
    })),
  });
}
