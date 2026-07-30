import type { AppRole } from "../supabase/types.ts";

export type Capability =
  | "profile:self"
  | "profile:client_manage"
  | "booking:own"
  | "booking:manage"
  | "queue:own"
  | "queue:manage"
  | "orders:own"
  | "orders:manage"
  | "membership:own"
  | "membership:manage"
  | "notifications:own"
  | "privacy:own"
  | "support:own"
  | "client:operational"
  | "client:manage"
  | "barber:manage"
  | "content:manage"
  | "services:manage"
  | "campaigns:manage"
  | "automation:manage"
  | "analytics:read"
  | "commission:own"
  | "commission:dispute"
  | "commission:manage"
  | "integrations:manage"
  | "webhooks:manage"
  | "users:manage"
  | "roles:manage"
  | "settings:manage"
  | "security:manage"
  | "audit:read";

const clientCapabilities: Capability[] = [
  "profile:self", "booking:own", "queue:own", "orders:own", "membership:own",
  "notifications:own", "privacy:own", "support:own",
];
const barberCapabilities: Capability[] = [
  "profile:self", "booking:manage", "queue:manage", "client:operational",
  "commission:own", "commission:dispute", "notifications:own",
];
const receptionCapabilities: Capability[] = [
  "profile:self", "booking:manage", "queue:manage", "client:operational",
  "profile:client_manage", "orders:manage", "notifications:own",
];
const managerCapabilities: Capability[] = [
  ...receptionCapabilities, "client:manage", "barber:manage", "content:manage",
  "services:manage", "campaigns:manage", "automation:manage", "analytics:read",
];
const ownerCapabilities: Capability[] = [
  ...clientCapabilities, ...barberCapabilities, ...managerCapabilities,
  "membership:manage", "commission:manage", "integrations:manage", "webhooks:manage",
  "users:manage", "roles:manage", "settings:manage", "security:manage", "audit:read",
];

const matrix: Record<AppRole, ReadonlySet<Capability>> = {
  client: new Set(clientCapabilities),
  barber: new Set(barberCapabilities),
  receptionist: new Set(receptionCapabilities),
  manager: new Set(managerCapabilities),
  owner: new Set(ownerCapabilities),
  super_admin: new Set(ownerCapabilities),
};

export function hasCapability(role: AppRole, capability: Capability) {
  return matrix[role].has(capability);
}

export function capabilitiesForRole(role: AppRole) {
  return [...matrix[role]];
}
