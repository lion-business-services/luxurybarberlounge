import { NextRequest, NextResponse } from "next/server";

import { bootstrapSquareCatalog } from "@/lib/integrations/bootstrapSquareCatalog";
import { syncSquareFoundation } from "@/lib/integrations/syncSquareFoundation";

export async function GET(request: NextRequest) {
  const received =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const bootstrap = await bootstrapSquareCatalog();
    const sync = await syncSquareFoundation();
    return NextResponse.json({ ok: true, bootstrap, sync });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Square bootstrap failed.",
      },
      { status: 500 },
    );
  }
}
