import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareRequest } from "@/lib/square/client";

type SquareMoney = {
  amount?: number;
  currency?: string;
};

type SquareOrderPayload = {
  id?: string;
  location_id?: string;
  customer_id?: string;
  state?: string;
  total_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_service_charge_money?: SquareMoney;
};

function cents(money: SquareMoney | undefined) {
  return Number(money?.amount ?? 0);
}

/**
 * Self-heals completed/approved Square payments whose related order webhook
 * was missed before the reconciliation worker sees them.
 */
export async function backfillMissingSquareOrders(limit = 100) {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", "luxury-barber-lounge")
    .maybeSingle();
  if (businessError || !business?.id) throw new Error("BUSINESS_NOT_CONFIGURED");

  const businessId = String(business.id);
  const { data: payments, error: paymentsError } = await admin
    .from("square_payments")
    .select("square_order_id")
    .eq("business_id", businessId)
    .in("status", ["COMPLETED", "APPROVED"])
    .not("square_order_id", "is", null)
    .gte("created_at_square", new Date(Date.now() - 21 * 24 * 60 * 60_000).toISOString())
    .limit(limit);
  if (paymentsError) throw paymentsError;

  const orderIds = [
    ...new Set(
      (payments ?? [])
        .map((payment) => String(payment.square_order_id ?? ""))
        .filter(Boolean),
    ),
  ];

  if (!orderIds.length) {
    return { checked: 0, backfilled: 0, failed: 0 };
  }

  const { data: existingOrders, error: existingError } = await admin
    .from("square_orders")
    .select("square_id")
    .eq("business_id", businessId)
    .in("square_id", orderIds);
  if (existingError) throw existingError;

  const existingIds = new Set(
    (existingOrders ?? []).map((order) => String(order.square_id)),
  );
  const missingIds = orderIds.filter((id) => !existingIds.has(id));

  let backfilled = 0;
  let failed = 0;

  for (const orderId of missingIds) {
    try {
      const response = await squareRequest<{ order?: SquareOrderPayload }>(
        `/v2/orders/${encodeURIComponent(orderId)}`,
      );
      const order = response.order;
      if (!order?.id) {
        failed += 1;
        continue;
      }

      const { error } = await admin.from("square_orders").upsert(
        {
          business_id: businessId,
          square_id: order.id,
          location_square_id: order.location_id ?? null,
          customer_square_id: order.customer_id ?? null,
          state: order.state ?? null,
          total_cents: cents(order.total_money),
          tax_cents: cents(order.total_tax_money),
          discount_cents: cents(order.total_discount_money),
          service_charge_cents: cents(order.total_service_charge_money),
          raw: order,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "business_id,square_id" },
      );

      if (error) {
        failed += 1;
      } else {
        backfilled += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    checked: orderIds.length,
    missing: missingIds.length,
    backfilled,
    failed,
  };
}
