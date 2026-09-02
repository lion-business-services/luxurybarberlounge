import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createUntypedAdminSupabase } from "@/lib/auth/server";

export function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getManagedAppointment(reference: string, token: string) {
  if (!reference || token.length < 20) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return null;

  const { data, error } = await admin
    .from("appointments")
    .select("id,business_id,location_id,client_id,auth_user_id,service_id,barber_profile_id,public_reference,square_booking_id,square_customer_id,square_order_id,status,starts_at,ends_at,timezone,service_name_snapshot,service_price_snapshot_cents,service_duration_snapshot_minutes,addon_snapshot,barber_name_snapshot,client_name_snapshot,client_email_snapshot,client_phone_snapshot,internal_notes,deposit_required_cents,deposit_status,manage_token_hash,balance_token_hash,created_at")
    .eq("public_reference", reference)
    .maybeSingle();

  if (error || !data) return null;
  const suppliedHash = hashManageToken(token);
  const manageValid = typeof data.manage_token_hash === "string" && constantTimeEqual(suppliedHash, data.manage_token_hash);
  const balanceValid = typeof data.balance_token_hash === "string" && constantTimeEqual(suppliedHash, data.balance_token_hash);
  if (!manageValid && !balanceValid) return null;

  const { data: location } = await admin
    .from("locations")
    .select("name,address_line_1,city,region,postal_code")
    .eq("id", data.location_id)
    .maybeSingle();

  return { admin, appointment: data, location: location ?? null };
}
