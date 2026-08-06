import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { processNotificationJobs } from "@/lib/notifications/process";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!expected || received !== expected) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  try {
    const result = await processNotificationJobs(admin, { limit: 50 });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, message: "Notification queue unavailable." }, { status: 503 });
  }
}
