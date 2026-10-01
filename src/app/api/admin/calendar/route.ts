import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { addDays, dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);
const visibleStatuses = ["confirmed", "checked_in", "assigned", "in_service", "completed", "cancelled_by_client", "cancelled_by_business", "no_show", "rescheduled"];

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function sameClient(appointment: Record<string, unknown>, historical: Record<string, unknown>) {
  const clientId = text(appointment.client_id);
  const historicalClientId = text(historical.client_id) ?? text(historical.client_record_id);
  if (clientId && historicalClientId && clientId === historicalClientId) return true;

  const email = text(appointment.client_email_snapshot)?.toLowerCase();
  const historicalEmail = (text(historical.client_email_snapshot) ?? text(historical.client_email))?.toLowerCase();
  if (email && historicalEmail && email === historicalEmail) return true;

  const phone = text(appointment.client_phone_snapshot);
  const historicalPhone = text(historical.client_phone_snapshot) ?? text(historical.client_phone);
  return Boolean(phone && historicalPhone && phone === historicalPhone);
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => allowed.has(role))) {
    return NextResponse.json({ ok: false, message: "Shop access is required." }, { status: 403 });
  }

  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Calendar data is unavailable." }, { status: 503 });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration is unavailable." }, { status: 503 });
  const { data: location } = await admin.from("locations").select("id,name").eq("business_id", business.id).eq("slug", "northfield").maybeSingle();
  if (!location?.id) return NextResponse.json({ ok: false, message: "Location configuration is unavailable." }, { status: 503 });

  const requestedStart = request.nextUrl.searchParams.get("start");
  const startDate = requestedStart && /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) ? requestedStart : dateInZone(new Date(), businessConfig.timezone);
  const days = Math.min(14, Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? 7) || 7));
  const endDate = addDays(startDate, days);
  const rangeStart = zonedDateTimeToUtc(startDate, "00:00:00", businessConfig.timezone).toISOString();
  const rangeEnd = zonedDateTimeToUtc(endDate, "00:00:00", businessConfig.timezone).toISOString();

  const [{ data: barbers, error: barberError }, { data: appointments, error: appointmentError }, { data: schedules, error: scheduleError }, { data: timeOff, error: timeOffError }] = await Promise.all([
    admin.from("barber_profiles").select("id,staff_user_id,display_name,availability_status,accepting_walk_ins,active,status,sort_order").eq("business_id", business.id).eq("active", true).neq("status", "archived").order("sort_order"),
    admin.from("appointments").select("id,public_reference,client_id,auth_user_id,client_name_snapshot,client_email_snapshot,client_phone_snapshot,service_name_snapshot,service_price_snapshot_cents,service_duration_snapshot_minutes,addon_snapshot,barber_profile_id,barber_name_snapshot,starts_at,ends_at,timezone,status,deposit_status,deposit_required_cents,booking_source,campaign_source,campaign_medium,campaign_name,referral_source,client_declared_status,client_notes,internal_notes,created_at,updated_at").eq("business_id", business.id).eq("location_id", location.id).eq("deposit_status", "paid").in("status", visibleStatuses).gte("starts_at", rangeStart).lt("starts_at", rangeEnd).order("starts_at"),
    admin.from("barber_schedules").select("id,barber_profile_id,barber_user_id,weekday,starts_at,ends_at,effective_from,effective_to,active").eq("location_id", location.id).eq("active", true),
    admin.from("barber_time_off").select("id,barber_profile_id,starts_at,ends_at,reason,status,availability_kind").eq("location_id", location.id).eq("status", "approved").lt("starts_at", rangeEnd).gt("ends_at", rangeStart).order("starts_at"),
  ]);

  if (barberError || appointmentError || scheduleError || timeOffError) {
    console.error("admin-calendar-load-failed", { barberError, appointmentError, scheduleError, timeOffError });
    return NextResponse.json({ ok: false, message: "The appointment calendar could not be loaded." }, { status: 503 });
  }

  const appointmentRows = (appointments ?? []) as Array<Record<string, unknown>>;
  const appointmentIds = appointmentRows.map((row) => String(row.id));
  const clientIds = [...new Set(appointmentRows.map((row) => text(row.client_id)).filter((id): id is string => Boolean(id)))];

  const [paymentLinksResult, notesResult, clientsResult, historyAppointmentsResult, historyQueueResult] = await Promise.all([
    appointmentIds.length
      ? admin.from("appointment_payment_links").select("id,appointment_id,purpose,amount_cents,square_order_id,status,paid_at,created_at,updated_at").in("appointment_id", appointmentIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? admin.from("appointment_notes").select("id,appointment_id,note,client_visible,created_at,updated_at").in("appointment_id", appointmentIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? admin.from("clients").select("id,first_name,last_name,email,phone,preferred_language,referral_source,acquisition_source,status,created_at,updated_at").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("appointments").select("id,client_id,client_email_snapshot,client_phone_snapshot,starts_at,status,deposit_status").eq("business_id", business.id).eq("deposit_status", "paid").in("status", visibleStatuses).lt("starts_at", rangeEnd).order("starts_at", { ascending: false }).limit(2000),
    admin.from("queue_entries").select("id,client_record_id,client_email,client_phone,walk_in_at,joined_at,completed_at,status").eq("business_id", business.id).is("appointment_id", null).eq("status", "completed").not("completed_at", "is", null).lt("completed_at", rangeEnd).order("completed_at", { ascending: false }).limit(2000),
  ]);

  const enrichmentErrors = [paymentLinksResult.error, notesResult.error, clientsResult.error, historyAppointmentsResult.error, historyQueueResult.error].filter(Boolean);
  if (enrichmentErrors.length) console.error("admin-calendar-enrichment-partial", enrichmentErrors);

  const paymentLinks = (paymentLinksResult.data ?? []) as Array<Record<string, unknown>>;
  const squareOrderIds = [...new Set(paymentLinks.map((row) => text(row.square_order_id)).filter((id): id is string => Boolean(id)))];
  const { data: squarePayments, error: squarePaymentError } = squareOrderIds.length
    ? await admin.from("square_payments").select("square_id,square_order_id,status,amount_cents,tip_cents,processing_fee_cents,card_brand,created_at_square,raw").eq("business_id", business.id).in("square_order_id", squareOrderIds).in("status", ["COMPLETED", "APPROVED"]).order("created_at_square", { ascending: false })
    : { data: [], error: null };
  if (squarePaymentError) console.error("admin-calendar-square-enrichment-partial", squarePaymentError);

  const clientById = new Map((clientsResult.data ?? []).map((row) => [String(row.id), row]));
  const linksByAppointment = new Map<string, Array<Record<string, unknown>>>();
  for (const row of paymentLinks) {
    const id = String(row.appointment_id);
    linksByAppointment.set(id, [...(linksByAppointment.get(id) ?? []), row]);
  }
  const notesByAppointment = new Map<string, Array<Record<string, unknown>>>();
  for (const row of notesResult.data ?? []) {
    const id = String(row.appointment_id);
    notesByAppointment.set(id, [...(notesByAppointment.get(id) ?? []), row]);
  }
  const squareByOrder = new Map<string, Array<Record<string, unknown>>>();
  const seenSquareIds = new Set<string>();
  for (const row of (squarePayments ?? []) as Array<Record<string, unknown>>) {
    const squareId = text(row.square_id);
    const orderId = text(row.square_order_id);
    if (!orderId || !squareId || seenSquareIds.has(squareId)) continue;
    seenSquareIds.add(squareId);
    squareByOrder.set(orderId, [...(squareByOrder.get(orderId) ?? []), row]);
  }

  const historyAppointments = (historyAppointmentsResult.data ?? []) as Array<Record<string, unknown>>;
  const historyQueue = (historyQueueResult.data ?? []) as Array<Record<string, unknown>>;

  const enrichedAppointments = appointmentRows.map((appointment) => {
    const appointmentId = String(appointment.id);
    const appointmentStarts = new Date(String(appointment.starts_at)).getTime();
    const client = text(appointment.client_id) ? clientById.get(String(appointment.client_id)) ?? null : null;
    const links = linksByAppointment.get(appointmentId) ?? [];
    const paidLinks = links.filter((row) => text(row.status) === "paid" && ["deposit", "balance"].includes(text(row.purpose) ?? ""));
    const paidPrincipalCents = paidLinks.reduce((sum, row) => sum + cents(row.amount_cents), 0);
    const orders = [...new Set(links.map((row) => text(row.square_order_id)).filter((id): id is string => Boolean(id)))];
    const squareRows = orders.flatMap((orderId) => squareByOrder.get(orderId) ?? []);
    const squareCollectedCents = squareRows.reduce((sum, row) => sum + cents(row.amount_cents), 0);
    const tipCents = squareRows.reduce((sum, row) => sum + cents(row.tip_cents), 0);
    const processingFeeCents = squareRows.reduce((sum, row) => sum + cents(row.processing_fee_cents), 0);
    const cardBrands = [...new Set(squareRows.map((row) => text(row.card_brand)).filter((brand): brand is string => Boolean(brand)))];
    const receiptRow = squareRows.find((row) => {
      const raw = row.raw && typeof row.raw === "object" && !Array.isArray(row.raw) ? row.raw as Record<string, unknown> : {};
      return Boolean(text(raw.receipt_url) || text(raw.receipt_number));
    }) ?? squareRows[0] ?? null;
    const receiptRaw = receiptRow?.raw && typeof receiptRow.raw === "object" && !Array.isArray(receiptRow.raw) ? receiptRow.raw as Record<string, unknown> : {};
    const paidAtCandidates = [
      ...paidLinks.map((row) => text(row.paid_at)),
      ...squareRows.map((row) => text(row.created_at_square)),
    ].filter((value): value is string => Boolean(value));
    const paidAt = paidAtCandidates.sort().at(-1) ?? null;

    const previousAppointmentVisits = historyAppointments.filter((row) => String(row.id) !== appointmentId && sameClient(appointment, row) && new Date(String(row.starts_at)).getTime() < appointmentStarts);
    const previousWalkInVisits = historyQueue.filter((row) => {
      if (!sameClient(appointment, row)) return false;
      const occurred = text(row.completed_at) ?? text(row.walk_in_at) ?? text(row.joined_at);
      return Boolean(occurred && new Date(occurred).getTime() < appointmentStarts);
    });
    const previousVisits = [
      ...previousAppointmentVisits.map((row) => text(row.starts_at)),
      ...previousWalkInVisits.map((row) => text(row.completed_at) ?? text(row.walk_in_at) ?? text(row.joined_at)),
    ].filter((value): value is string => Boolean(value)).sort();
    const declared = (text(appointment.client_declared_status) ?? "unsure").toLowerCase();
    const returningByDeclaration = ["existing", "returning", "revisit", "revisiting", "yes"].includes(declared);
    const clientType = previousVisits.length > 0 ? "returning" : returningByDeclaration ? "returning_declared" : declared === "new" ? "new" : "unknown";
    const serviceTotalCents = cents(appointment.service_price_snapshot_cents);

    return {
      ...appointment,
      payment: {
        status: text(appointment.deposit_status) === "paid" && paidPrincipalCents >= serviceTotalCents ? "paid_in_full" : text(appointment.deposit_status) ?? "unknown",
        paidPrincipalCents,
        squareCollectedCents: squareCollectedCents || paidPrincipalCents,
        amountDueCents: Math.max(0, serviceTotalCents - paidPrincipalCents),
        tipCents,
        processingFeeCents,
        paymentMethod: "square",
        cardBrands,
        paidAt,
        receiptNumber: text(receiptRaw.receipt_number),
        receiptUrl: text(receiptRaw.receipt_url),
        squarePaymentId: text(receiptRow?.square_id),
        links: links.map((row) => ({
          id: row.id,
          purpose: text(row.purpose),
          amountCents: cents(row.amount_cents),
          status: text(row.status),
          paidAt: text(row.paid_at),
        })),
      },
      clientInsights: {
        type: clientType,
        declaredStatus: declared,
        previousVisitCount: previousVisits.length,
        firstTrackedVisitAt: previousVisits[0] ?? null,
        lastTrackedVisitAt: previousVisits.at(-1) ?? null,
        clientSince: client?.created_at ?? null,
        clientProfileId: client?.id ? String(client.id) : null,
        preferredLanguage: text(client?.preferred_language),
        acquisitionSource: text(client?.acquisition_source),
        referralSource: text(client?.referral_source) ?? text(appointment.referral_source),
        profileStatus: text(client?.status),
      },
      notes: (notesByAppointment.get(appointmentId) ?? []).map((row) => ({
        id: String(row.id),
        note: text(row.note) ?? "",
        clientVisible: Boolean(row.client_visible),
        createdAt: text(row.created_at),
      })),
    };
  });

  const response = NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    timezone: businessConfig.timezone,
    location: String(location.name ?? "Northfield Lounge"),
    startDate,
    endDate,
    days: Array.from({ length: days }, (_, index) => addDays(startDate, index)),
    barbers: barbers ?? [],
    appointments: enrichedAppointments,
    schedules: schedules ?? [],
    timeOff: timeOff ?? [],
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
