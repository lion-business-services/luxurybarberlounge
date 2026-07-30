import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({ entryId: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("client")) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "A valid queue entry is required." }, { status: 400 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Queue services are not configured." }, { status: 503 });
  const { data: entry } = await admin.from("queue_entries").select("id,business_id,status").eq("id", parsed.data.entryId).eq("client_id", session.user.id).maybeSingle();
  if (!entry?.id) return NextResponse.json({ ok: false, message: "The queue entry is not available to this account." }, { status: 404 });
  if (!["waiting", "confirmed", "checked_in", "assigned", "called", "ready"].includes(String(entry.status))) return NextResponse.json({ ok: false, message: "This queue entry can no longer be cancelled online." }, { status: 409 });
  const { error } = await admin.from("queue_entries").update({ status: "cancelled" }).eq("id", entry.id).eq("client_id", session.user.id);
  if (error) return NextResponse.json({ ok: false, message: "The queue entry could not be updated." }, { status: 500 });
  await admin.from("queue_status_history").insert({ queue_entry_id: entry.id, from_status: entry.status, to_status: "cancelled", changed_by: session.user.id, note: "Client left the queue through the authenticated portal." });
  await admin.from("audit_logs").insert({ business_id: entry.business_id, actor_user_id: session.user.id, actor_role: "client", action: "queue_left", resource_type: "queue_entry", resource_id: entry.id, metadata: { previous_status: entry.status } });
  return NextResponse.json({ ok: true });
}
