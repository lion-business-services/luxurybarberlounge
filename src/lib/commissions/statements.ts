import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { addDays, dateInZone, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { absoluteUrl, businessConfig } from "@/lib/config/business";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

/**
 * Queues the prior Monday-Sunday statement for each linked barber on Monday.
 * Notification idempotency makes the 15-minute cron safe to run repeatedly.
 */
export async function queueMondayBarberStatements(reference = new Date()) {
  const localDate = dateInZone(reference, businessConfig.timezone);
  if (weekdayForDate(localDate) !== 1) {
    return { applicable: false, statements: 0, queued: 0, skipped: 0 };
  }

  const admin = createUntypedAdminSupabase();
  if (!admin) return { applicable: true, statements: 0, queued: 0, skipped: 0 };

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", businessConfig.slug)
    .maybeSingle();
  if (!business?.id) return { applicable: true, statements: 0, queued: 0, skipped: 0 };

  const previousMonday = addDays(localDate, -7);
  const currentMonday = localDate;
  const startsAt = zonedDateTimeToUtc(previousMonday, "00:00:00", businessConfig.timezone).toISOString();
  const endsAt = zonedDateTimeToUtc(currentMonday, "00:00:00", businessConfig.timezone).toISOString();

  const { data: periods, error: periodError } = await admin
    .from("settlement_periods")
    .select("id,label")
    .eq("business_id", business.id)
    .eq("starts_at", startsAt)
    .eq("ends_at", endsAt)
    .limit(10);
  if (periodError) throw periodError;

  const periodIds = (periods ?? []).map((period) => String(period.id));
  if (!periodIds.length) return { applicable: true, statements: 0, queued: 0, skipped: 0 };

  const { data: statements, error: statementError } = await admin
    .from("settlement_statements")
    .select("id,settlement_period_id,barber_user_id,gross_basis_cents,tips_cents,adjustments_cents,final_amount_cents,status,published_at")
    .in("settlement_period_id", periodIds)
    .neq("status", "voided");
  if (statementError) throw statementError;

  const barberUserIds = [...new Set((statements ?? []).map((statement) => String(statement.barber_user_id)).filter(Boolean))];
  const portalEmails = new Map<string, string>();
  if (barberUserIds.length) {
    const { data: profiles } = await admin
      .from("barber_profiles")
      .select("staff_user_id,display_name,portal_email")
      .eq("business_id", business.id)
      .in("staff_user_id", barberUserIds);
    for (const profile of profiles ?? []) {
      if (profile.staff_user_id && profile.portal_email) {
        portalEmails.set(String(profile.staff_user_id), String(profile.portal_email).trim().toLowerCase());
      }
    }
  }

  const periodLabels = new Map((periods ?? []).map((period) => [String(period.id), String(period.label)]));
  let queued = 0;
  let skipped = 0;

  for (const statement of statements ?? []) {
    const barberUserId = String(statement.barber_user_id);
    let recipient = portalEmails.get(barberUserId) ?? "";
    if (!recipient) {
      const { data: authUser } = await admin.auth.admin.getUserById(barberUserId);
      recipient = authUser?.user?.email?.trim().toLowerCase() ?? "";
    }
    if (!recipient) {
      skipped += 1;
      continue;
    }

    const periodLabel = periodLabels.get(String(statement.settlement_period_id)) ?? `${previousMonday} to ${addDays(currentMonday, -1)}`;
    const subject = `Luxury Barber Lounge statement • ${periodLabel}`;
    const body = [
      `Your Luxury Barber Lounge commission statement for ${periodLabel} is ready.`,
      `Commission basis: ${money(Number(statement.gross_basis_cents ?? 0))}`,
      `Tips: ${money(Number(statement.tips_cents ?? 0))}`,
      `Adjustments: ${money(Number(statement.adjustments_cents ?? 0))}`,
      `Calculated amount: ${money(Number(statement.final_amount_cents ?? 0))}`,
      "Disputes must be submitted to the owner by SMS within 24 hours under the confirmed commission rule.",
      `Review your statement: ${absoluteUrl("/barber/statements")}`,
      "Payout is handled manually by the owner via Zelle or cash.",
    ].join("\n");

    const { error: queueError } = await admin.from("notification_jobs").upsert(
      {
        business_id: business.id,
        user_id: barberUserId,
        channel: "email",
        template_key: null,
        locale: "en",
        recipient,
        payload: { subject, body, transactional: true, statementId: statement.id, settlementPeriodId: statement.settlement_period_id },
        idempotency_key: `commission-statement:${statement.id}`,
        scheduled_for: reference.toISOString(),
        status: "queued",
      },
      { onConflict: "channel,idempotency_key", ignoreDuplicates: true },
    );
    if (queueError) {
      skipped += 1;
      continue;
    }

    if (!statement.published_at || statement.status === "provisional") {
      await admin
        .from("settlement_statements")
        .update({ published_at: statement.published_at ?? reference.toISOString(), status: statement.status === "provisional" ? "review" : statement.status })
        .eq("id", statement.id)
        .in("status", ["provisional", "review"]);
    }
    queued += 1;
  }

  return { applicable: true, statements: (statements ?? []).length, queued, skipped };
}
