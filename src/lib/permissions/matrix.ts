import type { AppRole } from "../supabase/types.ts";

export type Capability =
  | "profile:self"
  | "booking:own"
  | "booking:manage"
  | "queue:own"
  | "queue:manage"
  | "client:operational"
  | "content:manage"
  | "services:manage"
  | "commission:own"
  | "commission:dispute"
  | "commission:manage"
  | "users:manage"
  | "settings:manage"
  | "audit:read";

const matrix: Record<AppRole, ReadonlySet<Capability>> = {
  client: new Set(["profile:self", "booking:own", "queue:own"]),
  barber: new Set(["profile:self", "queue:manage", "client:operational", "commission:own", "commission:dispute"]),
  receptionist: new Set(["profile:self", "booking:manage", "queue:manage", "client:operational"]),
  manager: new Set(["profile:self", "booking:manage", "queue:manage", "client:operational", "content:manage", "services:manage", "commission:manage", "audit:read"]),
  owner: new Set(["profile:self", "booking:own", "booking:manage", "queue:own", "queue:manage", "client:operational", "content:manage", "services:manage", "commission:own", "commission:dispute", "commission:manage", "users:manage", "settings:manage", "audit:read"]),
  super_admin: new Set(["profile:self", "booking:own", "booking:manage", "queue:own", "queue:manage", "client:operational", "content:manage", "services:manage", "commission:own", "commission:dispute", "commission:manage", "users:manage", "settings:manage", "audit:read"]),
};

export function hasCapability(role: AppRole, capability: Capability) {
  return matrix[role].has(capability);
}
