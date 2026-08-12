import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getManagedAppointment } from "@/lib/booking/manage";
import { squareConfig } from "@/lib/square/config";
import { squareRequest, SquareApiError, SquareConfigurationError } from "@/lib/square/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ reference: z.string().trim().min(4).max(80), token: z.string().trim().min(20).max(300) });
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
  const amount = Number(appointment.deposit_required_cents ?? 0);
  if (amount <= 0 || appointment.deposit_status === "not_required") return NextResponse.json({ ok: true, paid: true, message: "No deposit is required for this appointment." });
  if (appointment.deposit_status === "paid") return NextResponse.json({ ok: true, paid: true, message: "The deposit is already paid." });
  if (!squareConfig.locationId || !squareConfig.accessToken) return NextResponse.json({ ok: false, message: "Square checkout is not configured yet." }, { status: 503 });

  const { data: existing } = await admin.from("appointment_payment_links").select("checkout_url,status").eq("appointment_id", appointment.id).eq("purpose", "deposit").in("status", ["created", "paid"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.status === "paid") return NextResponse.json({ ok: true, paid: true, message: "The deposit is already paid." });
  if (typeof existing?.checkout_url === "string" && existing.checkout_url) return NextResponse.json({ ok: true, paid: false, url: existing.checkout_url });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");
  const redirectUrl = `${siteUrl}/booking/confirmation/${encodeURIComponent(appointment.public_reference)}?token=${encodeURIComponent(parsed.data.token)}&payment=return`;
  try {
    const response = await squareRequest<SquarePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      idempotencyKey: `lbl-deposit-${appointment.id}`,
      body: {
        description: `Luxury Barber Lounge booking deposit ${appointment.public_reference}`,
        payment_note: `LBL_DEPOSIT:${appointment.id}:${appointment.public_reference}`,
        quick_pay: {
          name: `Deposit - ${appointment.service_name_snapshot}`.slice(0, 255),
          price_money: { amount, currency: "USD" },
          location_id: squareConfig.locationId,
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
      purpose: "deposit",
      amount_cents: amount,
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
