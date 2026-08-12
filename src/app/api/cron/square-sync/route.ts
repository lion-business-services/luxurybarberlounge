import { NextRequest, NextResponse } from "next/server";

import { syncSquareFoundation } from "@/lib/integrations/syncSquareFoundation";

export async function GET(request: NextRequest) {
  const received =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await syncSquareFoundation());
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Square synchronization failed.",
      },
      { status: 500 },
    );
  }
}
