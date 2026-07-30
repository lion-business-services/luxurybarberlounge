import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const schema = z.object({
  action: z.enum(["enable", "disable", "enable_test", "disable_test"]),
  reason: z.string().trim().min(3).max(500),
});

function providerReady(channels: unknown) {
  const values = Array.isArray(channels) ? channels.map(String) : [];
  if (values.includes("email") && !(process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY)) return "Configure Resend before activating email automations.";
  if (values.includes("sms") && !(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)) return "Configure the SMS provider before activating SMS automations.";
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext({ ownerOnly: true });
  if (!context?.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Owner access and Supabase are required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const { id } = await params;
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, message: "A valid automation action and reason are required." }, { status: 400 });
  const { data: current } = await context.admin.from("automation_rules").select("id,name,key,channels,active,test_mode,version").eq("business_id", context.businessId).eq("id", id).maybeSingle();
  if (!current?.id) return NextResponse.json({ ok: false, message: "Automation rule not found." }, { status: 404 });
  if (parsed.data.action === "enable") {
    const blocker = providerReady(current.channels);
    if (blocker) return NextResponse.json({ ok: false, message: blocker }, { status: 409 });
  }
  const update = parsed.data.action === "enable" ? { active: true, test_mode: false }
    : parsed.data.action === "disable" ? { active: false }
      : parsed.data.action === "enable_test" ? { active: false, test_mode: true }
        : { test_mode: false, active: false };
  const { error } = await context.admin.from("automation_rules").update(update).eq("business_id", context.businessId).eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: "The automation state could not be changed." }, { status: 500 });
  await context.admin.from("audit_logs").insert({
    business_id: context.businessId,
    actor_user_id: context.session.user.id,
    actor_role: "owner",
    action: `automation_${parsed.data.action}`,
    resource_type: "automation_rule",
    resource_id: id,
    before_data: current,
    after_data: { ...current, ...update },
    reason: parsed.data.reason,
    metadata: {},
  });
  return NextResponse.json({ ok: true, state: update });
}
