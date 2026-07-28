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
  | "called"
  | "checked_in"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";

export type { Database, Json } from "./database.types";
