import { NextRequest, NextResponse } from "next/server";
import { features } from "@/lib/config/features";
import { reconcileCommissions } from "@/lib/commissions/reconcile";

export async function GET(request: NextRequest) {
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  if (!features.liveSquare) return NextResponse.json({ ok: true, skipped: true, reason: "live Square disabled" });
  try { return NextResponse.json({ ok: true, ...(await reconcileCommissions(100)) }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Commission reconciliation failed." }, { status: 500 }); }
}
