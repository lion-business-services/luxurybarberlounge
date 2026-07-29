export type AppRole = "client" | "barber" | "receptionist" | "manager" | "owner" | "super_admin";

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: "en" | "es";
  status: "active" | "invited" | "suspended";
};

export type QueueStatus =
  | "waiting"
  | "confirmed"
  | "checked_in"
  | "assigned"
  | "called"
  | "ready"
  | "in_service"
  | "completed"
  | "cancelled"
  | "removed"
  | "no_show";

export type { Database, Json } from "./database.types";

export type * from "./operational.types";
