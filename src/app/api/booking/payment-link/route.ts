import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getManagedAppointment } from "@/lib/booking/manage";
import { squareConfig } from "@/lib/square/config";
import { squareRequest, SquareApiError, SquareConfigurationError } from "@/lib/square/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isHoldStatus } from "@/lib/booking/rules";

// Service fee applied to every online payment. Itemised on the Square receipt.
const SERVICE_FEE_PERCENT = "4.0";
const SERVICE_FEE_LABEL = "Service fee (4%)";
const HOLD_EXPIRED_MESSAGE = "This reservation expired before payment was completed and the time is no longer held. Please book a new time.";

type ServiceItem = { sequence: number; role: string; service_name_snapshot: string; price_snapshot_cents: number };

/**
 * Square order lines. A first, full family payment is itemized (adult service,
 * then Kids Haircut x N) so the receipt matches the booking summary. The lines
 * always add up to exactly the outstanding service principal.
 */
function orderLineItems(input: { amount: number; paidPrincipalCents: number; serviceName: string; items: ServiceItem[] }) {
  const itemsTotal = input.items.reduce((sum, item) => sum + item.price_snapshot_cents, 0);
  if (input.items.length > 1 && input.paidPrincipalCents === 0 && itemsTotal === input.amount) {
    const grouped = new Map<string, { name: string; quantity: number; price: number }>();
    for (const item of [...input.items].sort((a, b) => a.sequence - b.sequence)) {
      const key = `${item.service_name_snapshot}:${item.price_snapshot_cents}`;
      const current = grouped.get(key);
      if (current) current.quantity += 1;
      else grouped.set(key, { name: item.service_name_snapshot, quantity: 1, price: item.price_snapshot_cents });
    }
    return [...grouped.values()].map((line) => ({
      name: `Family booking: ${line.name}`.slice(0, 255),
      quantity: String(line.quantity),
      base_price_money: { amount: line.price, currency: "USD" },
    }));
  }
  return [
    {
      name: `${input.paidPrincipalCents > 0 ? "Remaining booking payment" : "Booking payment"}: ${input.serviceName}`.slice(0, 255),
      quantity: "1",
      base_price_money: { amount: input.amount, currency: "USD" },
    },
  ];
}

const schema = z.object({
  purpose: z.enum(["deposit", "balance"]).optional(),
  reference: z.string().trim().min(4).max(80),
  token: z.string().trim().min(20).max(300),
});
type SquarePaymentLinkResponse = { payment_link?: { id?: string; order_id?: string; url?: string; long_url?: string } };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "guest";
  if (!checkRateLimit(`booking-payment-link:${ip}`, 20, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before trying again." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "The booking link is invalid." }, { status: 400 });
  }

  const managed = await getManagedAppointment(parsed.data.reference, parsed.data.token);
  if (!managed) {
    return NextResponse.json({ ok: false, message: "Appointment not found." }, { status: 404 });
  }

  const { admin } = managed;
  let appointment = managed.appointment;
  if (["cancelled_by_client", "cancelled_by_business", "declined", "expired", "failed"].includes(appointment.status)) {
    return NextResponse.json({ ok: false, code: appointment.status === "expired" ? "HOLD_EXPIRED" : "NOT_PAYABLE", message: appointment.status === "expired" ? HOLD_EXPIRED_MESSAGE : "This appointment is not eligible for payment." }, { status: 409 });
  }

  // An unpaid checkout only holds its time for a limited window. When the
  // client comes back after that window, the database renews the hold only if
  // the time is still free. Otherwise the booking is expired and no payment
  // is taken for a slot that now belongs to someone else.
  if (isHoldStatus(String(appointment.status)) && appointment.deposit_status !== "paid") {
    const { data: renewed, error: renewError } = await admin.rpc("renew_appointment_hold", { p_appointment_id: appointment.id });
    if (renewError) {
      console.error("booking-payment-link", { code: "HOLD_RENEWAL_FAILED", appointmentId: appointment.id, dbCode: renewError.code });
      return NextResponse.json({ ok: false, message: "The reservation could not be verified. Please try again." }, { status: 503 });
    }
    const renewedRow = (Array.isArray(renewed) ? renewed[0] : renewed) as { status?: string } | null;
    if (renewedRow?.status === "expired") {
      console.warn("booking-payment-link", { code: "HOLD_EXPIRED", appointmentId: appointment.id, barberId: appointment.barber_profile_id, requestedStart: appointment.starts_at });
      return NextResponse.json({ ok: false, code: "HOLD_EXPIRED", message: HOLD_EXPIRED_MESSAGE }, { status: 409 });
    }
    if (renewedRow?.status) appointment = { ...appointment, ...renewedRow };
  }

  const servicePrice = Number(appointment.service_price_snapshot_cents ?? 0);
  if (servicePrice <= 0) {
    return NextResponse.json({ ok: false, message: "This appointment does not have a valid service price." }, { status: 409 });
  }

  // Full prepayment is required for every website booking. Historical payment
  // links are counted by their service principal only; Square's 4% service fee
  // is deliberately excluded from the amount credited toward the service.
  const { data: paidLinks, error: paidLinksError } = await admin
    .from("appointment_payment_links")
    .select("amount_cents")
    .eq("appointment_id", appointment.id)
    .eq("status", "paid")
    .in("purpose", ["deposit", "balance"]);
  if (paidLinksError) {
    return NextResponse.json({ ok: false, message: "The payment balance could not be verified." }, { status: 500 });
  }

  const paidPrincipalCents = (paidLinks ?? []).reduce(
    (sum, link) => sum + Math.max(0, Number(link.amount_cents ?? 0)),
    0,
  );
  const amount = Math.max(0, servicePrice - paidPrincipalCents);

  if (amount <= 0) {
    if (appointment.deposit_required_cents !== servicePrice || appointment.deposit_status !== "paid") {
      await admin
        .from("appointments")
        .update({ deposit_required_cents: servicePrice, deposit_status: "paid" })
        .eq("id", appointment.id);
    }
    return NextResponse.json({ ok: true, paid: true, message: "The required booking payment is already paid in full." });
  }

  if (!squareConfig.locationId || !squareConfig.accessToken) {
    return NextResponse.json({ ok: false, message: "Square checkout is not configured yet." }, { status: 503 });
  }

  if (squareConfig.environment === "sandbox") {
    const allowed = new Set(
      (process.env.SQUARE_SANDBOX_TEST_EMAILS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    const bookingEmail = String(appointment.client_email_snapshot ?? "").trim().toLowerCase();
    if (!bookingEmail || !allowed.has(bookingEmail)) {
      return NextResponse.json(
        { ok: false, message: "Square Sandbox checkout is restricted to authorized test bookings." },
        { status: 409 },
      );
    }
  }

  // Pending confirmations always use the internal "deposit" purpose because
  // the Square webhook promotes that purpose only after the database verifies
  // that total paid principal equals the full service price. "balance" remains
  // supported for older post-confirmation links.
  const requestedPurpose = parsed.data.purpose === "balance" ? "balance" : "deposit";
  const purpose = appointment.status === "pending_confirmation" ? "deposit" : requestedPurpose;

  const { data: existing } = await admin
    .from("appointment_payment_links")
    .select("checkout_url,status,amount_cents")
    .eq("appointment_id", appointment.id)
    .eq("purpose", purpose)
    .eq("status", "created")
    .eq("amount_cents", amount)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (typeof existing?.checkout_url === "string" && existing.checkout_url) {
    return NextResponse.json({ ok: true, paid: false, url: existing.checkout_url, amountCents: amount });
  }

  // Fail closed on any obsolete unpaid link: cancel it at Square before a new
  // amount is issued, so a stale lower-priced checkout can never remain usable.
  const { data: staleLinks, error: staleLinksError } = await admin
    .from("appointment_payment_links")
    .select("id,square_payment_link_id,amount_cents")
    .eq("appointment_id", appointment.id)
    .eq("purpose", purpose)
    .eq("status", "created")
    .neq("amount_cents", amount);
  if (staleLinksError) {
    return NextResponse.json({ ok: false, message: "Existing payment links could not be verified." }, { status: 500 });
  }

  for (const stale of staleLinks ?? []) {
    const squarePaymentLinkId = String(stale.square_payment_link_id ?? "");
    if (!squarePaymentLinkId) {
      return NextResponse.json({ ok: false, message: "An obsolete checkout link needs administrator review." }, { status: 409 });
    }
    try {
      await squareRequest(`/v2/online-checkout/payment-links/${encodeURIComponent(squarePaymentLinkId)}`, {
        method: "DELETE",
      });
      await admin
        .from("appointment_payment_links")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", stale.id)
        .eq("status", "created");
    } catch {
      return NextResponse.json(
        { ok: false, message: "An obsolete Square checkout could not be cancelled safely. Please contact the lounge." },
        { status: 502 },
      );
    }
  }

  const { data: serviceItems } = appointment.booking_kind === "family"
    ? await admin
        .from("appointment_service_items")
        .select("sequence,role,service_name_snapshot,price_snapshot_cents")
        .eq("appointment_id", appointment.id)
        .order("sequence")
    : { data: [] as ServiceItem[] };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");
  const redirectUrl = `${siteUrl}/booking/confirmation/${encodeURIComponent(appointment.public_reference)}?token=${encodeURIComponent(parsed.data.token)}&payment=return`;

  try {
    const response = await squareRequest<SquarePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      idempotencyKey: `lbl-prepay-${appointment.id}-${purpose}-${amount}-${paidPrincipalCents}`,
      body: {
        description: `Luxury Barber Lounge required booking payment ${appointment.public_reference}`,
        payment_note: `LBL_PREPAY:${appointment.id}:${appointment.public_reference}`,
        // A full order (not quick_pay) keeps the 4% service fee separately
        // itemised on the Square receipt instead of hiding it in the service price.
        order: {
          location_id: squareConfig.locationId,
          reference_id: String(appointment.public_reference).slice(0, 40),
          line_items: orderLineItems({
            amount,
            paidPrincipalCents,
            serviceName: String(appointment.service_name_snapshot),
            items: (serviceItems ?? []) as ServiceItem[],
          }),
          service_charges: [
            {
              name: SERVICE_FEE_LABEL,
              percentage: SERVICE_FEE_PERCENT,
              calculation_phase: "SUBTOTAL_PHASE",
              taxable: false,
            },
          ],
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: redirectUrl,
          ask_for_shipping_address: false,
        },
        pre_populated_data: {
          ...(appointment.client_email_snapshot ? { buyer_email: appointment.client_email_snapshot } : {}),
          ...(appointment.client_phone_snapshot ? { buyer_phone_number: appointment.client_phone_snapshot } : {}),
        },
      },
    });

    const link = response.payment_link;
    const checkoutUrl = link?.url || link?.long_url;
    if (!link?.id || !link.order_id || !checkoutUrl) {
      return NextResponse.json({ ok: false, message: "Square did not return a usable checkout link." }, { status: 502 });
    }

    const { error } = await admin.from("appointment_payment_links").insert({
      business_id: appointment.business_id,
      appointment_id: appointment.id,
      purpose,
      amount_cents: amount,
      // amount_cents is service principal only. Square adds the 4% fee on top.
      square_payment_link_id: link.id,
      square_order_id: link.order_id,
      checkout_url: checkoutUrl,
      status: "created",
    });
    if (error && error.code !== "23505") {
      return NextResponse.json({ ok: false, message: "The checkout link could not be saved." }, { status: 500 });
    }

    await admin
      .from("appointments")
      .update({
        deposit_required_cents: servicePrice,
        deposit_status: "pending",
        ...(appointment.status === "confirmed" && paidPrincipalCents < servicePrice
          ? { status: "pending_confirmation" }
          : {}),
      })
      .eq("id", appointment.id);

    return NextResponse.json({ ok: true, paid: false, url: checkoutUrl, amountCents: amount });
  } catch (error) {
    if (error instanceof SquareConfigurationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 503 });
    }
    if (error instanceof SquareApiError) {
      return NextResponse.json({ ok: false, message: "Square checkout could not be created. Please try again or contact the lounge." }, { status: 502 });
    }
    return NextResponse.json({ ok: false, message: "Square checkout could not be created." }, { status: 500 });
  }
}
