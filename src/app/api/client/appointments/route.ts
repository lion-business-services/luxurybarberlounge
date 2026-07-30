import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingProvider } from "@/lib/booking";
import { createUserServerSupabase, createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const mutationSchema = z.object({ appointmentId: z.string().uuid(), startsAt: z.string().datetime().optional() });
const immutableStatuses = new Set(["COMPLETED", "CANCELLED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_SELLER", "NO_SHOW"]);

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  return supabase ? { session, supabase } : null;
}

async function ownedBooking(value: Awaited<ReturnType<typeof context>>, appointmentId: string) {
  if (!value) return null;
  const { data } = await value.supabase.from("booking_metadata").select("id,business_id,square_booking_id,metadata").eq("id", appointmentId).eq("client_user_id", value.session.user.id).maybeSingle();
  if (!data?.id || !data.square_booking_id) return null;
  const { data: square } = await value.supabase.from("square_bookings").select("id,status,starts_at").eq("business_id", data.business_id).eq("square_id", data.square_booking_id).maybeSingle();
  return { booking: data, square };
}

export async function PATCH(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = mutationSchema.required({ startsAt: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Date(parsed.data.startsAt).getTime() <= Date.now()) return NextResponse.json({ ok: false, message: "Choose a valid future appointment time." }, { status: 400 });
  const record = await ownedBooking(value, parsed.data.appointmentId);
  if (!record) return NextResponse.json({ ok: false, message: "The appointment is not available to this account." }, { status: 404 });
  if (immutableStatuses.has(String(record.square?.status ?? "").toUpperCase())) return NextResponse.json({ ok: false, message: "Historical appointments cannot be changed." }, { status: 409 });
  const provider = getBookingProvider();
  if (provider.mode === "development") return NextResponse.json({ ok: false, message: "Live Square rescheduling is not active yet. Contact the lounge to change this appointment." }, { status: 409 });
  try {
    const updated = await provider.updateBooking(String(record.booking.square_booking_id), { startsAt: parsed.data.startsAt }, randomUUID());
    const admin = createUntypedAdminSupabase();
    if (admin) {
      await admin.from("square_bookings").update({ starts_at: updated.startsAt, status: updated.status, synced_at: new Date().toISOString() }).eq("business_id", record.booking.business_id).eq("square_id", record.booking.square_booking_id);
      await admin.from("appointment_status_history").insert({ booking_metadata_id: record.booking.id, from_status: String(record.square?.status ?? "confirmed").toLowerCase(), to_status: "rescheduled", changed_by: value.session.user.id, reason: "Client rescheduled through the portal", metadata: { source: "client_portal", previous_starts_at: record.square?.starts_at, starts_at: updated.startsAt } });
      await admin.from("audit_logs").insert({ business_id: record.booking.business_id, actor_user_id: value.session.user.id, actor_role: "client", action: "appointment_rescheduled", resource_type: "booking_metadata", resource_id: record.booking.id, metadata: { starts_at: updated.startsAt } });
    }
    return NextResponse.json({ ok: true, startsAt: updated.startsAt });
  } catch {
    return NextResponse.json({ ok: false, message: "Square could not confirm the new time. Contact the lounge before making travel plans." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = mutationSchema.pick({ appointmentId: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "A valid appointment is required." }, { status: 400 });
  const record = await ownedBooking(value, parsed.data.appointmentId);
  if (!record) return NextResponse.json({ ok: false, message: "The appointment is not available to this account." }, { status: 404 });
  if (immutableStatuses.has(String(record.square?.status ?? "").toUpperCase())) return NextResponse.json({ ok: false, message: "This appointment can no longer be cancelled online." }, { status: 409 });
  const provider = getBookingProvider();
  if (provider.mode === "development") return NextResponse.json({ ok: false, message: "Live Square cancellation is not active yet. Contact the lounge to cancel this appointment." }, { status: 409 });
  try {
    const cancelled = await provider.cancelBooking(String(record.booking.square_booking_id), randomUUID());
    const admin = createUntypedAdminSupabase();
    if (admin) {
      await admin.from("square_bookings").update({ status: cancelled.status, synced_at: new Date().toISOString() }).eq("business_id", record.booking.business_id).eq("square_id", record.booking.square_booking_id);
      await admin.from("appointment_status_history").insert({ booking_metadata_id: record.booking.id, from_status: String(record.square?.status ?? "confirmed").toLowerCase(), to_status: "cancelled", changed_by: value.session.user.id, reason: "Client cancelled through the portal", metadata: { source: "client_portal" } });
      await admin.from("audit_logs").insert({ business_id: record.booking.business_id, actor_user_id: value.session.user.id, actor_role: "client", action: "appointment_cancelled", resource_type: "booking_metadata", resource_id: record.booking.id, metadata: {} });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Square could not confirm the cancellation. Contact the lounge for assistance." }, { status: 502 });
  }
}
