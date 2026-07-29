import type { AppRole } from "@/lib/supabase/types";
import { requirePortalAccess } from "@/lib/auth/server";

export async function PortalAccessGate({ allowed, root, children }: { allowed: readonly AppRole[]; root: string; children: React.ReactNode }) {
  await requirePortalAccess(allowed, root);
  return children;
}
