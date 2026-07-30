import "server-only";
import { createUntypedAdminSupabase, getServerAuthSession } from "./server";

export async function getAdminBusinessContext(options: { ownerOnly?: boolean } = {}) {
  const session = await getServerAuthSession();
  const allowed = options.ownerOnly ? ["owner", "super_admin"] : ["manager", "owner", "super_admin"];
  if (!session.user || !session.roles.some((role) => allowed.includes(role))) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return { session, admin: null, businessId: null };
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  return { session, admin, businessId: typeof business?.id === "string" ? business.id : null };
}
