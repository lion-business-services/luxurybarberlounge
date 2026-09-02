import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/server";
import { loadCommissionPaySummary } from "@/lib/commissions/pay-summary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false, message: "Sign in is required." }, { status: 401 });

  try {
    const summary = await loadCommissionPaySummary({ userId: session.user.id, roles: session.roles });
    const response = NextResponse.json(summary);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, message: "Commission access is required." }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Pay summary could not be loaded." }, { status: 503 });
  }
}
