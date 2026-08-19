import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareConfig } from "@/lib/square/config";
import { squareRequest } from "@/lib/square/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

type SquarePaymentLinkResponse = {
  payment_link?: { id?: string; order_id?: string; url?: string; long_url?: string };
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function constantTimeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * One-click balance payment from the confirmation email.
 *
 * Validates the single-purpose balance token, creates (or reuses) a Square
 * checkout link for the outstanding amount, and redirects straight to Square.
 * The client never sees an intermediate page and never has to log in.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "guest";
  if (!checkRateLimit(`balance-link:${ip}`, 20, 60_000).allowed) {
    return NextResponse.redirect(`${site}/booking/balance-error?reason=rate`, 302);
  }

  const admin = createUntypedAdminSupabase();
  if (!admin || !token) return NextResponse.redirect(`${site}/booking/balance-error?reason=invalid`, 302);

  const { data: appointment } = await admin
    .from("appointments")
    .select("id,business_id,public_reference,status,balance_token_hash,deposit_required_cents,service_price_snapshot_cents,service_name_snapshot,client_email_snapshot,client_phone_snapshot")
    .eq("public_reference", reference)
    .maybeSingle();

  if (!appointment?.balance_token_hash || !constantTimeEqual(hash(token), String(appointment.balance_token_hash))) {
    return NextResponse.redirect(`${site}/booking/balance-error?reason=invalid`, 302);
  }

  if (["cancelled_by_client", "cancelled_by_business", "declined", "expired", "failed"].includes(String(appointment.status))) {
    return NextResponse.redirect(`${site}/booking/balance-error?reason=cancelled`, 302);
  }

  const price = Number(appointment.service_price_snapshot_cents ?? 0);
  const deposit = Number(appointment.deposit_required_cents ?? 0);
  const amount = Math.max(0, price - deposit);
  if (amount <= 0) return NextResponse.redirect(`${site}/booking/balance-error?reason=nothing_due`, 302);

  // Reuse an existing balance link rather than creating duplicate Square orders.
  const { data: existing } = await admin
    .from("appointment_payment_links")
    .select("checkout_url,status")
    .eq("appointment_id", appointment.id)
    .eq("purpose", "balance")
    .in("status", ["created", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === "paid") return NextResponse.redirect(`${site}/booking/balance-error?reason=already_paid`, 302);
  if (typeof existing?.checkout_url === "string" && existing.checkout_url) {
    return NextResponse.redirect(existing.checkout_url, 302);
  }

  try {
    const response = await squareRequest<SquarePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      idempotencyKey: `lbl-balance-${appointment.id}`,
      body: {
        description: `Luxury Barber Lounge balance ${appointment.public_reference}`,
        payment_note: `LBL_BALANCE:${appointment.id}:${appointment.public_reference}`,
        quick_pay: {
          name: `Balance - ${appointment.service_name_snapshot}`.slice(0, 255),
          price_money: { amount, currency: "USD" },
          location_id: squareConfig.locationId,
        },
        checkout_options: {
          allow_tipping: true,
          redirect_url: `${site}/booking/balance-paid?ref=${encodeURIComponent(String(appointment.public_reference))}`,
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
      return NextResponse.redirect(`${site}/booking/balance-error?reason=square`, 302);
    }

    await admin.from("appointment_payment_links").insert({
      business_id: appointment.business_id,
      appointment_id: appointment.id,
      purpose: "balance",
      amount_cents: amount,
      square_payment_link_id: link.id,
      square_order_id: link.order_id,
      checkout_url: checkoutUrl,
      status: "created",
    });

    return NextResponse.redirect(checkoutUrl, 302);
  } catch {
    return NextResponse.redirect(`${site}/booking/balance-error?reason=square`, 302);
  }
}
