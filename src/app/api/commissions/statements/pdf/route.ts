import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/server";
import { buildCommissionPdf } from "@/lib/commissions/pdf";
import { loadCommissionPaySummary } from "@/lib/commissions/pay-summary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const adminRoles = new Set(["manager", "owner", "super_admin"]);

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "statement";
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false, message: "Sign in is required." }, { status: 401 });

  try {
    const summary = await loadCommissionPaySummary({ userId: session.user.id, roles: session.roles });
    const administrative = session.roles.some((role) => adminRoles.has(role));
    const requestedBarberId = request.nextUrl.searchParams.get("barberUserId");
    const statementId = request.nextUrl.searchParams.get("statementId");
    const effectiveBarberId = administrative ? requestedBarberId : session.user.id;

    let statements = summary.statements as Array<Record<string, unknown>>;
    let calculations = summary.calculations as Array<Record<string, unknown>>;

    if (statementId) {
      statements = statements.filter((row) => String(row.id) === statementId);
      const periodIds = new Set(statements.map((row) => String(row.settlement_period_id)));
      const barberIds = new Set(statements.map((row) => String(row.barber_user_id)));
      calculations = calculations.filter((row) => periodIds.has(String(row.settlement_period_id)) && barberIds.has(String(row.barber_user_id)));
    } else if (effectiveBarberId) {
      statements = statements.filter((row) => String(row.barber_user_id) === effectiveBarberId);
      calculations = calculations.filter((row) => String(row.barber_user_id) === effectiveBarberId);
    } else if (administrative) {
      const latestByBarber = new Map<string, Record<string, unknown>>();
      for (const statement of statements) {
        const barberId = String(statement.barber_user_id ?? "");
        if (barberId && !latestByBarber.has(barberId)) latestByBarber.set(barberId, statement);
      }
      statements = [...latestByBarber.values()];
      const keys = new Set(statements.map((row) => `${String(row.barber_user_id)}:${String(row.settlement_period_id)}`));
      calculations = calculations.filter((row) => keys.has(`${String(row.barber_user_id)}:${String(row.settlement_period_id)}`));
    }

    if (!statements.length) return NextResponse.json({ ok: false, message: "No commission statement is available yet." }, { status: 404 });

    const pdf = buildCommissionPdf({ statements, calculations });
    const label = statements.length === 1 ? String(statements[0].barber_name ?? "barber") : "all-barbers";
    const period = statements.length === 1 ? String(statements[0].period_label ?? "weekly") : "latest-weekly";
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="luxury-barber-lounge-${safeFilename(label)}-${safeFilename(period)}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, message: "Commission access is required." }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Statement PDF could not be generated." }, { status: 500 });
  }
}
