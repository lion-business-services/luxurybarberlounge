import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";
import { businessConfig } from "@/lib/config/business";
import { searchSupabaseAvailability } from "@/lib/booking/availability";
import { getBookingAdminContext } from "@/lib/booking/catalog";
import { queueBookingNotifications } from "@/lib/booking/notifications";
import { processNotificationJobs } from "@/lib/notifications/process";
import { bookingSubmissionSchema } from "@/lib/booking/schema";
import { dateInZone } from "@/lib/booking/timezone";
import { sendFormSubmitBooking } from "@/lib/email/formsubmit";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

function manageToken(idempotencyKey: string) {
  const secret = process.env.BOOKING_MANAGE_SECRET || process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("BOOKING_MANAGE_SECRET_REQUIRED");
  return createHmac("sha256", secret || "development-only-booking-secret").update(idempotencyKey).digest("base64url");
}
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function referenceCode() { return `LBL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`; }
function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : value.trim(); }

export async function POST(request: NextRequest) {
  const limited = rateLimit({ key: `booking-submit:${requestFingerprint(request.headers)}`, limit: 5, windowMs: 15 * 60_000 });
  if (!limited.allowed) return NextResponse.json({ ok: false, message: "Please wait before submitting another appointment." }, { status: 429 });
  const parsed = bookingSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the highlighted booking information and try again.", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  const input = parsed.data;
  if (input.company) return NextResponse.json({ ok: true, reference: "LBL-RECEIVED" }, { status: 201 });
  try {
    const { admin, catalog } = await getBookingAdminContext();
    const durableKey = createHash("sha256").update(`booking-submit:${requestFingerprint(request.headers)}`).digest("hex");
    const { data: durableLimit, error: durableLimitError } = await admin.rpc("consume_rate_limit", {
      p_key: durableKey,
      p_limit: 8,
      p_window_seconds: 900,
    });
    if (durableLimitError) throw new Error("BOOKING_RATE_LIMIT_UNAVAILABLE");
    const durableResult = durableLimit && typeof durableLimit === "object" ? durableLimit as { allowed?: boolean; retry_after_seconds?: number } : {};
    if (durableResult.allowed === false) {
      return NextResponse.json(
        { ok: false, message: "Please wait before submitting another appointment." },
        { status: 429, headers: { "Retry-After": String(durableResult.retry_after_seconds ?? 900) } },
      );
    }
    const token = manageToken(input.idempotencyKey);
    const { data: existingAppointment } = await admin
      .from("appointments")
      .select("id,public_reference,status,starts_at,ends_at,service_name_snapshot,barber_name_snapshot,service_duration_snapshot_minutes,service_price_snapshot_cents,deposit_required_cents,formsubmit_status")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existingAppointment?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        confirmation: {
          id: existingAppointment.id,
          reference: existingAppointment.public_reference,
          status: existingAppointment.status,
          startsAt: existingAppointment.starts_at,
          endsAt: existingAppointment.ends_at,
          serviceName: existingAppointment.service_name_snapshot,
          barberName: existingAppointment.barber_name_snapshot,
          locationName: catalog.location.name,
          locationAddress: catalog.location.address,
          durationMinutes: existingAppointment.service_duration_snapshot_minutes,
          estimatedPriceCents: existingAppointment.service_price_snapshot_cents,
          depositCents: existingAppointment.deposit_required_cents,
          manageToken: token,
          notificationState: existingAppointment.formsubmit_status === "sent" ? "sent" : "queued",
        },
        formSubmit: { status: existingAppointment.formsubmit_status },
      });
    }
    const service = catalog.services.find((item) => item.id === input.serviceId && item.slug === input.serviceSlug);
    const addons = catalog.addons.filter((item) => input.addonIds.includes(item.id));
    if (!service) return NextResponse.json({ ok: false, message: "That service is no longer available." }, { status: 409 });
    if (addons.length !== input.addonIds.length) return NextResponse.json({ ok: false, message: "One of the selected add-ons is no longer available." }, { status: 409 });
    const availability = await searchSupabaseAvailability({ locationId: input.locationId, serviceId: input.serviceId, addonIds: input.addonIds, barberIds: input.barberId ? [input.barberId] : undefined, startDate: dateInZone(new Date(input.startsAt), catalog.location.timezone), days: 1 });
    const exact = availability.slots.find((slot) => slot.startsAt === input.startsAt && (!input.barberId || slot.barberId === input.barberId));
    if (!exact) return NextResponse.json({ ok: false, code: "SLOT_TAKEN", message: "That time was just reserved. Choose another available time.", alternatives: availability.slots.slice(0, 6) }, { status: 409 });
    const barber = catalog.barbers.find((item) => item.id === exact.barberId);
    if (!barber) return NextResponse.json({ ok: false, message: "That barber is no longer available." }, { status: 409 });

    const { data: business, error: businessError } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).single();
    if (businessError || !business?.id) throw new Error("BUSINESS_NOT_CONFIGURED");
    const session = await getServerAuthSession();
    const email = input.email.toLowerCase();
    const phone = normalizePhone(input.phone);
    const [{ data: emailMatch }, { data: phoneMatch }] = await Promise.all([
      admin.from("clients").select("id,auth_user_id").eq("business_id", business.id).eq("email", email).maybeSingle(),
      admin.from("clients").select("id,auth_user_id").eq("business_id", business.id).eq("phone", phone).maybeSingle(),
    ]);
    if (emailMatch?.id && phoneMatch?.id && emailMatch.id !== phoneMatch.id) return NextResponse.json({ ok: false, message: "We found conflicting contact records. Please call the lounge so we can protect your account." }, { status: 409 });
    let clientId = (emailMatch?.id ?? phoneMatch?.id) as string | undefined;
    const clientPayload = { business_id: business.id, auth_user_id: session.user?.id ?? emailMatch?.auth_user_id ?? phoneMatch?.auth_user_id ?? null, first_name: input.firstName, last_name: input.lastName, email, phone, preferred_language: input.preferredLanguage, referral_source: input.referralSource, acquisition_source: input.campaignSource ?? input.source, communication_preferences: { email: input.emailConsent, sms: input.smsConsent }, metadata: { existing_client_response: input.existingClient }, status: "active" };
    if (clientId) {
      const { error } = await admin.from("clients").update(clientPayload).eq("id", clientId);
      if (error) throw new Error("CLIENT_UPDATE_FAILED");
    } else {
      const { data, error } = await admin.from("clients").insert(clientPayload).select("id").single();
      if (error || !data?.id) {
        const { data: retry } = await admin.from("clients").select("id").eq("business_id", business.id).eq("email", email).maybeSingle();
        if (!retry?.id) throw new Error("CLIENT_CREATE_FAILED");
        clientId = retry.id;
      } else clientId = data.id;
    }

    if (!clientId) throw new Error("CLIENT_CREATE_FAILED");
    const priceCents = service.priceCents + addons.reduce((sum, addon) => sum + addon.priceCents, 0);
    const durationMinutes = service.durationMinutes + addons.reduce((sum, addon) => sum + addon.durationMinutes, 0);
    const { data: appointment, error: bookingError } = await admin.rpc("create_appointment_atomic", { p_data: {
      business_id: business.id, location_id: input.locationId, client_id: clientId, auth_user_id: session.user?.id ?? null, service_id: service.id, barber_profile_id: barber.id, public_reference: referenceCode(), manage_token_hash: tokenHash(token), service_name_snapshot: service.name, service_price_snapshot_cents: priceCents, service_duration_snapshot_minutes: durationMinutes, addon_snapshot: addons.map((addon) => ({ id: addon.id, slug: addon.slug, name: addon.name, durationMinutes: addon.durationMinutes, priceCents: addon.priceCents })), barber_name_snapshot: barber.name, client_name_snapshot: `${input.firstName} ${input.lastName}`, client_email_snapshot: email, client_phone_snapshot: phone, starts_at: exact.startsAt, ends_at: exact.endsAt, timezone: catalog.location.timezone, status: "confirmed", booking_source: input.source, campaign_source: input.campaignSource, campaign_medium: input.campaignMedium, campaign_name: input.campaignName, referral_source: input.referralSource, deposit_required_cents: service.depositCents, deposit_status: service.depositCents > 0 ? "pending" : "not_required", client_notes: input.notes, policy_version: input.policyVersion, policy_accepted_at: new Date().toISOString(), email_consent: input.emailConsent, sms_consent: input.smsConsent, idempotency_key: input.idempotencyKey, first_available: input.firstAvailable, formsubmit_status: process.env.FORMSUBMIT_ENABLED === "false" ? "disabled" : "queued", sync_status: "supabase_primary", created_by: session.user?.id ?? null,
    } });
    if (bookingError || !appointment) {
      if (bookingError?.code === "23P01" || /SLOT_CONFLICT/.test(bookingError?.message ?? "")) return NextResponse.json({ ok: false, code: "SLOT_TAKEN", message: "That time was just reserved. Choose another available time." }, { status: 409 });
      throw new Error(bookingError?.message || "BOOKING_CREATE_FAILED");
    }
    const record = Array.isArray(appointment) ? appointment[0] : appointment;
    if (addons.length) await admin.from("appointment_addons").upsert(addons.map((addon) => ({ appointment_id: record.id, addon_id: addon.id, addon_name_snapshot: addon.name, price_snapshot_cents: addon.priceCents, duration_snapshot_minutes: addon.durationMinutes })), { onConflict: "appointment_id,addon_name_snapshot", ignoreDuplicates: true });
    await admin.from("consent_records").insert([
      { user_id: session.user?.id ?? null, business_id: business.id, subject_email: email, subject_phone: phone, consent_type: "booking_policy", granted: true, source: "booking", policy_version: input.policyVersion, metadata: { appointment_id: record.id } },
      { user_id: session.user?.id ?? null, business_id: business.id, subject_email: email, subject_phone: phone, consent_type: "transactional_email", granted: input.emailConsent, source: "booking", policy_version: input.policyVersion, metadata: { appointment_id: record.id } },
      { user_id: session.user?.id ?? null, business_id: business.id, subject_email: email, subject_phone: phone, consent_type: "transactional_sms", granted: input.smsConsent, source: "booking", policy_version: input.policyVersion, metadata: { appointment_id: record.id } },
    ]);

    const subject = `New Booking: ${record.client_name_snapshot} • ${record.service_name_snapshot}`;
    const disabled = process.env.FORMSUBMIT_ENABLED === "false";
    const { data: existingDelivery } = await admin
      .from("formsubmit_deliveries")
      .select("id,status,attempt_count")
      .eq("appointment_id", record.id)
      .maybeSingle();
    let delivery = existingDelivery;
    if (!delivery?.id) {
      const inserted = await admin
        .from("formsubmit_deliveries")
        .insert({ appointment_id: record.id, recipient_email: businessConfig.bookingEmail, subject, status: disabled ? "disabled" : "processing", attempt_count: disabled ? 0 : 1 })
        .select("id,status,attempt_count")
        .single();
      delivery = inserted.data;
    }
    let formSubmitStatus = delivery?.status ?? (disabled ? "disabled" : "queued");
    if (!disabled && formSubmitStatus !== "sent") {
      const formSubmit = await sendFormSubmitBooking(record);
      formSubmitStatus = formSubmit.status;
      if (delivery?.id) {
        await admin.from("formsubmit_deliveries").update({
          status: formSubmit.status,
          attempt_count: Number(delivery.attempt_count ?? 0) + (existingDelivery ? 1 : 0),
          response_status: formSubmit.responseStatus,
          sanitized_response: formSubmit.response,
          last_error: formSubmit.error,
          sent_at: formSubmit.status === "sent" ? new Date().toISOString() : null,
          next_attempt_at: ["failed", "awaiting_activation"].includes(formSubmit.status) ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
        }).eq("id", delivery.id);
      }
      await admin.from("appointments").update({ formsubmit_status: formSubmit.status }).eq("id", record.id);
    }
    await queueBookingNotifications(admin, record, token);
    let notificationState = "queued";
    try {
      const notificationResult = await processNotificationJobs(admin, { appointmentId: record.id, limit: 10 });
      notificationState = notificationResult.delivered > 0 ? "sent" : "queued";
    } catch (notificationError) {
      console.error("booking-notification-immediate", { code: notificationError instanceof Error ? notificationError.message : "DELIVERY_DEFERRED" });
    }
    return NextResponse.json({ ok: true, confirmation: { id: record.id, reference: record.public_reference, status: record.status, startsAt: record.starts_at, endsAt: record.ends_at, serviceName: record.service_name_snapshot, barberName: record.barber_name_snapshot, locationName: catalog.location.name, locationAddress: catalog.location.address, durationMinutes, estimatedPriceCents: priceCents, depositCents: service.depositCents, manageToken: token, notificationState }, formSubmit: { status: formSubmitStatus } }, { status: 201 });
  } catch (error) {
    console.error("booking-submit", { code: error instanceof Error ? error.message.slice(0, 120) : "BOOKING_FAILED" });
    return NextResponse.json({ ok: false, message: `We could not reserve that appointment. Please try again or call the lounge at ${businessConfig.phone}.` }, { status: 503 });
  }
}
