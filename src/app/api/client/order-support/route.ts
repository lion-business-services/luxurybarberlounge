import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserServerSupabase, createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({ orderId: z.string().uuid(), subject: z.string().trim().min(3).max(120), message: z.string().trim().min(5).max(1200) });

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid order-support request." }, { status: 400 });
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return NextResponse.json({ ok: false, message: "Order support is not configured." }, { status: 503 });
  const { data: client } = await supabase.from("client_profiles").select("business_id,square_customer_id").eq("user_id", session.user.id).maybeSingle();
  if (!client?.business_id || !client.square_customer_id) return NextResponse.json({ ok: false, message: "This account is not linked to an order profile." }, { status: 409 });
  const { data: order } = await supabase.from("square_orders").select("id").eq("id", parsed.data.orderId).eq("business_id", client.business_id).eq("customer_square_id", client.square_customer_id).maybeSingle();
  if (!order?.id) return NextResponse.json({ ok: false, message: "The order is not available to this account." }, { status: 404 });
  const { data, error } = await supabase.from("order_support_cases").insert({ business_id: client.business_id, square_order_id: order.id, client_user_id: session.user.id, subject: parsed.data.subject, message: parsed.data.message }).select("id").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: "The request could not be recorded." }, { status: 500 });
  const admin = createUntypedAdminSupabase();
  if (admin) await admin.from("audit_logs").insert({ business_id: client.business_id, actor_user_id: session.user.id, actor_role: "client", action: "order_support_requested", resource_type: "order_support_case", resource_id: data.id, metadata: { square_order_id: order.id } });
  return NextResponse.json({ ok: true, caseId: data.id });
}
