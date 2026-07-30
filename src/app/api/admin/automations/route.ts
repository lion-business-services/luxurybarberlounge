import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const channel = z.enum(["email", "sms", "in_app", "push", "whatsapp"]);
const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
  key: z.string().trim().min(3).max(100).regex(/^[a-z0-9_]+$/),
  triggerKey: z.string().trim().min(3).max(120).regex(/^[a-z0-9_.-]+$/),
  channels: z.array(channel).min(1).max(3),
  delaySeconds: z.number().int().min(0).max(2_592_000).default(0),
});

export async function POST(request: NextRequest) {
  const context = await getAdminBusinessContext({ ownerOnly: true });
  if (!context?.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Owner access and Supabase are required." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the automation name, key, trigger, channels, and delay." }, { status: 400 });
  const { data, error } = await context.admin.from("automation_rules").insert({
    business_id: context.businessId,
    name: parsed.data.name,
    key: parsed.data.key,
    trigger_key: parsed.data.triggerKey,
    channels: parsed.data.channels,
    delay_seconds: parsed.data.delaySeconds,
    conditions: [],
    actions: [{ type: "enqueue_notification" }],
    quiet_hours: { enabled: true, timezone: "America/New_York", start: "20:00", end: "08:00" },
    consent_requirements: { marketing_required: true },
    test_mode: true,
    active: false,
    version: 1,
    created_by: context.session.user.id,
  }).select("id,name,key,trigger_key,channels,delay_seconds,active,test_mode,version").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: error?.code === "23505" ? "That automation key already exists." : "The automation rule could not be created." }, { status: 500 });
  await context.admin.from("audit_logs").insert({
    business_id: context.businessId,
    actor_user_id: context.session.user.id,
    actor_role: "owner",
    action: "automation_rule_created",
    resource_type: "automation_rule",
    resource_id: data.id,
    after_data: data,
    reason: "Created in test mode",
    metadata: {},
  });
  return NextResponse.json({ ok: true, rule: data });
}
