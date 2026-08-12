import { NextRequest, NextResponse } from "next/server";
import { reconcileCommissions } from "@/lib/commissions/reconcile";
import { queueMondayBarberStatements } from "@/lib/commissions/statements";
import { backfillMissingSquareOrders } from "@/lib/integrations/backfillSquareOrders";
import { squareIsConfigured } from "@/lib/square/config";

export async function GET(request: NextRequest) {
  const received =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!squareIsConfigured) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Square not configured",
    });
  }

  try {
    const orderBackfill = await backfillMissingSquareOrders(100);
    const reconciliation = await reconcileCommissions(100);
    const statementDelivery = await queueMondayBarberStatements();
    return NextResponse.json({
      ok: true,
      orderBackfill,
      ...reconciliation,
      statementDelivery,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Commission reconciliation failed.",
      },
      { status: 500 },
    );
  }
}
