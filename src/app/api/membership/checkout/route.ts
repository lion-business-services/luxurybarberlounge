import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { squareConfig } from "@/lib/square/config";
import { squareRequest } from "@/lib/square/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  planSlug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  barberProfileId: z.string().uuid().optional(),
  clientStatus: z.enum(["new", "existing"]).optional(),
});

type SquarePaymentLinkResponse = {
  payment_link?: { id?: string; order_id?: string; url?: string; long_url?: string };
};

/**
 * Membership purchase.
 *
 * Square subscriptions require a card on file, which cannot be captured from a
 * public web form without PCI exposure. So the first month is collected through
 * a normal Square checkout link (card stored via the checkout), and the
 * recurring subscription is attached to that customer by the webhook once the
 * payment settles. This keeps card data entirely inside Square.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "guest";
  if (!checkRateLimit(`membership-checkout:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before trying again." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Please choose a membership and provide your details." }, { status: 400 });
  }

  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Memberships are not available right now." }, { status: 503 });

  const session = await getServerAuthSession();

  const { data: plan } = await admin
    .from("membership_plans")
    .select("id,business_id,slug,name,price_cents,billing_interval,square_catalog_id,active")
    .eq("slug", parsed.data.planSlug)
    .eq("active", true)
    .maybeSingle();

  if (!plan?.square_catalog_id) {
    return NextResponse.json({ ok: false, message: "That membership is not available for purchase." }, { status: 404 });
  }

  const email = parsed.data.email ?? session.user?.email ?? null;
  const name = parsed.data.name ?? null;
  if (!email) {
    return NextResponse.json({ ok: false, message: "An email address is required to start a membership." }, { status: 422 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");
  const planName = (plan.name as { en?: string })?.en ?? "Membership";

  try {
    const response = await squareRequest<SquarePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      idempotencyKey: `lbl-membership-${plan.slug}-${email}-${Date.now()}`,
      body: {
        description: `Luxury Barber Lounge membership - ${planName}`,
        // The webhook reads this note to attach the recurring subscription.
        payment_note: `LBL_MEMBERSHIP:${plan.id}:${plan.square_catalog_id}`,
        order: {
          location_id: squareConfig.locationId,
          line_items: [
            {
              name: `${planName} - first month`.slice(0, 255),
              quantity: "1",
              base_price_money: { amount: Number(plan.price_cents), currency: "USD" },
            },
          ],
          service_charges: [
            {
              name: "Service fee (4%)",
              percentage: "4.0",
              calculation_phase: "SUBTOTAL_PHASE",
              taxable: false,
            },
          ],
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: `${site}/membership/welcome?plan=${encodeURIComponent(plan.slug)}`,
          ask_for_shipping_address: false,
        },
        pre_populated_data: {
          buyer_email: email,
          ...(parsed.data.phone ? { buyer_phone_number: parsed.data.phone } : {}),
        },
      },
    });

    const link = response.payment_link;
    const checkoutUrl = link?.url || link?.long_url;
    if (!link?.id || !checkoutUrl) {
      return NextResponse.json({ ok: false, message: "Square did not return a checkout link." }, { status: 502 });
    }

    // Record the intent so the webhook can complete enrolment, and so the admin
    // can see abandoned signups.
    await admin.from("membership_checkout_intents").insert({
      business_id: plan.business_id,
      plan_id: plan.id,
      client_user_id: session.user?.id ?? null,
      email,
      name,
      phone: parsed.data.phone ?? null,
      barber_profile_id: parsed.data.barberProfileId ?? null,
      client_status: parsed.data.clientStatus ?? null,
      square_payment_link_id: link.id,
      square_order_id: link.order_id ?? null,
      checkout_url: checkoutUrl,
      status: "created",
    });

    return NextResponse.json({ ok: true, url: checkoutUrl });
  } catch {
    return NextResponse.json({ ok: false, message: "The membership checkout could not be created." }, { status: 502 });
  }
}
