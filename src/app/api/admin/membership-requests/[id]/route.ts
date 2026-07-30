import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const schema = z.object({ status: z.enum(["in_review", "provider_pending", "completed", "rejected", "cancelled"]), note: z.string().trim().min(3).max(1000) });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); const { id } = await params;
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, message: "A valid decision and note are required." }, { status: 400 });
  const { data: current } = await context.admin.from("membership_requests").select("id,status,client_user_id,membership_id,request_type").eq("business_id", context.businessId).eq("id", id).maybeSingle();
  if (!current?.id) return NextResponse.json({ ok: false, message: "Membership request not found." }, { status: 404 });
  if (parsed.data.status === "completed" && !context.session.roles.some((role) => role === "owner" || role === "super_admin")) return NextResponse.json({ ok: false, message: "Owner approval is required to mark provider action complete." }, { status: 403 });
  const { error } = await context.admin.from("membership_requests").update({ status: parsed.data.status, review_note: parsed.data.note, reviewed_by: context.session.user.id, reviewed_at: new Date().toISOString() }).eq("id", id).eq("business_id", context.businessId);
  if (error) return NextResponse.json({ ok: false, message: "The request could not be updated." }, { status: 500 });
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "membership_request_reviewed", resource_type: "membership_request", resource_id: id, before_data: current, after_data: { status: parsed.data.status }, reason: parsed.data.note, metadata: {} });
  return NextResponse.json({ ok: true });
}
