import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getManagedAppointment } from "@/lib/booking/manage";
import { squareConfig } from "@/lib/square/config";
import { squareRequest, SquareApiError, SquareConfigurationError } from "@/lib/square/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Service fee applied to every online payment. Itemised on the Square receipt.
const SERVICE_FEE_PERCENT = "4.0";
const SERVICE_FEE_LABEL = "Service fee (4%)";

const schema = z.object({
  purpose: z.enum(["deposit", "balance"]).optional(), reference: z.string().trim().min(4).max(80), token: z.string().trim().min(20).max(300) });
type SquarePaymentLinkResponse = { payment_link?: { id?: string; order_id?: string; url?: string; long_url?: string } };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "guest";
  if (!checkRateLimit(`booking-payment-link:${ip}`, 20, 60_000).allowed) return NextResponse.json({ ok: false, message: "Please wait before trying again." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "The booking link is invalid." }, { status: 400 });
  const managed = await getManagedAppointment(parsed.data.reference, parsed.data.token);
  if (!managed) return NextResponse.json({ ok: false, message: "Appointment not found." }, { status: 404 });
  const { appointment, admin } = managed;
  if (["cancelled_by_client", "cancelled_by_business", "declined", "expired", "failed"].includes(appointment.status)) return NextResponse.json({ ok: false, message: "This appointment is not eligible for a deposit payment." }, { status: 409 });
  const requestedPurpose = parsed.data.purpose === "balance" ? "balance" : "deposit";
  const servicePrice = Number(appointment.service_price_snapshot_cents ?? 0);
  const depositCents = Number(appointment.deposit_required_cents ?? 0);
  // The balance is whatever remains of the service after the deposit.
  const amount = requestedPurpose === "balance" ? Math.max(0, servicePrice - depositCents) : depositCents;
  if (amount <= 0 || (requestedPurpose === "deposit" && appointment.deposit_status === "not_required")) return NextResponse.json({ ok: true, paid: true, message: "No payment is required for this appointment." });
  if (requestedPurpose === "deposit" && appointment.deposit_status === "paid") return NextResponse.json({ ok: true, paid: true, message: "The deposit is already paid." });
  if (!squareConfig.locationId || !squareConfig.accessToken) return NextResponse.json({ ok: false, message: "Square checkout is not configured yet." }, { status: 503 });

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

  // "deposit" is the up-front 50%; "balance" is the remainder due at the shop.
  const purpose = requestedPurpose;
  const { data: existing } = await admin.from("appointment_payment_links").select("checkout_url,status").eq("appointment_id", appointment.id).eq("purpose", purpose).in("status", ["created", "paid"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.status === "paid") return NextResponse.json({ ok: true, paid: true, message: purpose === "balance" ? "The balance is already paid." : "The deposit is already paid." });
  if (typeof existing?.checkout_url === "string" && existing.checkout_url) return NextResponse.json({ ok: true, paid: false, url: existing.checkout_url });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");
  const redirectUrl = `${siteUrl}/booking/confirmation/${encodeURIComponent(appointment.public_reference)}?token=${encodeURIComponent(parsed.data.token)}&payment=return`;
  try {
    const response = await squareRequest<SquarePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      idempotencyKey: `lbl-${purpose}-${appointment.id}`,
      body: {
        description: `Luxury Barber Lounge ${purpose === "balance" ? "balance" : "booking deposit"} ${appointment.public_reference}`,
        payment_note: `${purpose === "balance" ? "LBL_BALANCE" : "LBL_DEPOSIT"}:${appointment.id}:${appointment.public_reference}`,
        // A full order (not quick_pay) so the 4% service fee appears as its own
        // itemised line on the Square receipt. Bundling it into a single total
        // would hide the charge from the client, which is both poor practice
        // and a disclosure problem for a consumer-facing surcharge.
        order: {
          location_id: squareConfig.locationId,
          reference_id: String(appointment.public_reference).slice(0, 40),
          line_items: [
            {
              name: `${appointment.service_name_snapshot}`.slice(0, 255),
              quantity: "1",
              base_price_money: { amount, currency: "USD" },
            },
          ],
          service_charges: [
            {
              name: SERVICE_FEE_LABEL,
              percentage: SERVICE_FEE_PERCENT,
              calculation_phase: "SUBTOTAL_PHASE",
              taxable: false,
            },
          ],
        },
        checkout_options: { allow_tipping: false, redirect_url: redirectUrl, ask_for_shipping_address: false },
        pre_populated_data: {
          ...(appointment.client_email_snapshot ? { buyer_email: appointment.client_email_snapshot } : {}),
          ...(appointment.client_phone_snapshot ? { buyer_phone_number: appointment.client_phone_snapshot } : {}),
        },
      },
    });
    const link = response.payment_link;
    const checkoutUrl = link?.url || link?.long_url;
    if (!link?.id || !link.order_id || !checkoutUrl) return NextResponse.json({ ok: false, message: "Square did not return a usable checkout link." }, { status: 502 });
    const { error } = await admin.from("appointment_payment_links").insert({
      business_id: appointment.business_id,
      appointment_id: appointment.id,
      purpose,
      amount_cents: amount,
      // amount_cents is the service amount; the 4% fee is added by Square at
      // checkout and arrives on the order/payment records.
      square_payment_link_id: link.id,
      square_order_id: link.order_id,
      checkout_url: checkoutUrl,
      status: "created",
    });
    if (error && error.code !== "23505") return NextResponse.json({ ok: false, message: "The checkout link could not be saved." }, { status: 500 });
    await admin.from("appointments").update({ deposit_status: "pending" }).eq("id", appointment.id).neq("deposit_status", "paid");
    return NextResponse.json({ ok: true, paid: false, url: checkoutUrl });
  } catch (error) {
    if (error instanceof SquareConfigurationError) return NextResponse.json({ ok: false, message: error.message }, { status: 503 });
    if (error instanceof SquareApiError) return NextResponse.json({ ok: false, message: "Square checkout could not be created. Please try again or contact the lounge." }, { status: 502 });
    return NextResponse.json({ ok: false, message: "Square checkout could not be created." }, { status: 500 });
  }
}
