import { NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => allowed.has(role))) {
    return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
  }

  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Payment tracking is unavailable." }, { status: 503 });

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration is unavailable." }, { status: 503 });
  const businessId = String(business.id);

  const [{ data: walkPayments, error: walkError }, { data: appointmentLinks, error: linkError }] = await Promise.all([
    admin.from("walk_in_payments")
      .select("id,queue_entry_id,barber_profile_id,payment_method,status,amount_cents,tip_cents,processing_fee_cents,square_receipt_number,square_receipt_url,paid_at,created_at,updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin.from("appointment_payment_links")
      .select("id,appointment_id,purpose,amount_cents,square_order_id,status,paid_at,created_at,updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (walkError || linkError) return NextResponse.json({ ok: false, message: "Payment records could not be loaded." }, { status: 503 });

  const queueIds = [...new Set((walkPayments ?? []).map((row) => String(row.queue_entry_id)))];
  const appointmentIds = [...new Set((appointmentLinks ?? []).map((row) => String(row.appointment_id)))];
  const barberIds = [...new Set((walkPayments ?? []).map((row) => row.barber_profile_id ? String(row.barber_profile_id) : null).filter((id): id is string => Boolean(id)))];
  const squareOrderIds = [...new Set((appointmentLinks ?? []).map((row) => row.square_order_id ? String(row.square_order_id) : null).filter((id): id is string => Boolean(id)))];

  const [{ data: queues }, { data: appointments }, { data: barbers }, { data: squarePayments }] = await Promise.all([
    queueIds.length ? admin.from("queue_entries").select("id,client_name,client_email,client_phone,service_slug,walk_in_at,joined_at,service_price_snapshot_cents").in("id", queueIds) : Promise.resolve({ data: [] }),
    appointmentIds.length ? admin.from("appointments").select("id,public_reference,client_name_snapshot,client_email_snapshot,client_phone_snapshot,service_name_snapshot,barber_name_snapshot,starts_at,status,deposit_status,service_price_snapshot_cents").in("id", appointmentIds) : Promise.resolve({ data: [] }),
    barberIds.length ? admin.from("barber_profiles").select("id,display_name").in("id", barberIds) : Promise.resolve({ data: [] }),
    squareOrderIds.length ? admin.from("square_payments").select("square_order_id,square_id,status,amount_cents,tip_cents,processing_fee_cents,card_brand,created_at_square").in("square_order_id", squareOrderIds).order("created_at_square", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const queueById = new Map((queues ?? []).map((row) => [String(row.id), row]));
  const appointmentById = new Map((appointments ?? []).map((row) => [String(row.id), row]));
  const barberById = new Map((barbers ?? []).map((row) => [String(row.id), String(row.display_name ?? "Barber")]));
  const squareByOrder = new Map<string, Record<string, unknown>>();
  for (const row of squarePayments ?? []) {
    const key = String(row.square_order_id ?? "");
    if (key && !squareByOrder.has(key)) squareByOrder.set(key, row as Record<string, unknown>);
  }

  const walkIns = (walkPayments ?? []).map((payment) => {
    const queue = queueById.get(String(payment.queue_entry_id));
    return {
      id: String(payment.id),
      source: "walk_in" as const,
      clientName: String(queue?.client_name ?? "Walk-in guest"),
      clientEmail: queue?.client_email ? String(queue.client_email) : null,
      clientPhone: queue?.client_phone ? String(queue.client_phone) : null,
      barberName: payment.barber_profile_id ? barberById.get(String(payment.barber_profile_id)) ?? "Assigned barber" : "Assigned barber",
      serviceName: String(queue?.service_slug ?? "Service").replaceAll("-", " "),
      serviceAt: String(queue?.walk_in_at ?? queue?.joined_at ?? payment.created_at),
      paymentMethod: String(payment.payment_method ?? "unknown"),
      paymentStatus: String(payment.status ?? "pending"),
      amountCents: Number(payment.amount_cents ?? 0),
      tipCents: Number(payment.tip_cents ?? 0),
      processingFeeCents: Number(payment.processing_fee_cents ?? 0),
      paidAt: payment.paid_at ? String(payment.paid_at) : null,
      receiptNumber: payment.square_receipt_number ? String(payment.square_receipt_number) : null,
      receiptUrl: payment.square_receipt_url ? String(payment.square_receipt_url) : null,
      reference: String(payment.queue_entry_id).slice(0, 8).toUpperCase(),
    };
  });

  const appointmentPayments = (appointmentLinks ?? []).map((link) => {
    const appointment = appointmentById.get(String(link.appointment_id));
    const square = link.square_order_id ? squareByOrder.get(String(link.square_order_id)) : undefined;
    return {
      id: String(link.id),
      source: "appointment" as const,
      clientName: String(appointment?.client_name_snapshot ?? "Appointment client"),
      clientEmail: appointment?.client_email_snapshot ? String(appointment.client_email_snapshot) : null,
      clientPhone: appointment?.client_phone_snapshot ? String(appointment.client_phone_snapshot) : null,
      barberName: String(appointment?.barber_name_snapshot ?? "Assigned barber"),
      serviceName: String(appointment?.service_name_snapshot ?? "Service"),
      serviceAt: String(appointment?.starts_at ?? link.created_at),
      paymentMethod: "square",
      paymentStatus: String(link.status ?? appointment?.deposit_status ?? "pending"),
      appointmentStatus: appointment?.status ? String(appointment.status) : null,
      amountCents: Number(link.amount_cents ?? 0),
      tipCents: Number(square?.tip_cents ?? 0),
      processingFeeCents: Number(square?.processing_fee_cents ?? 0),
      paidAt: link.paid_at ? String(link.paid_at) : (square?.created_at_square ? String(square.created_at_square) : null),
      receiptNumber: square?.square_id ? String(square.square_id) : null,
      receiptUrl: null,
      reference: String(appointment?.public_reference ?? link.id),
      cardBrand: square?.card_brand ? String(square.card_brand) : null,
      purpose: String(link.purpose ?? "payment"),
    };
  });

  const totalPaid = [...walkIns, ...appointmentPayments].filter((row) => row.paymentStatus === "paid").reduce((sum, row) => sum + row.amountCents, 0);
  const response = NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    walkIns,
    appointments: appointmentPayments,
    summary: {
      totalPaidCents: totalPaid,
      walkInPaidCount: walkIns.filter((row) => row.paymentStatus === "paid").length,
      appointmentPaidCount: appointmentPayments.filter((row) => row.paymentStatus === "paid").length,
      pendingCount: [...walkIns, ...appointmentPayments].filter((row) => row.paymentStatus === "pending").length,
    },
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
