import "server-only";
import { absoluteUrl, businessConfig } from "@/lib/config/business";

type FormSubmitAppointment = {
  id: string;
  public_reference: string;
  client_name_snapshot: string;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  service_name_snapshot: string;
  addon_snapshot: unknown;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  deposit_status: string;
  client_notes: string | null;
  booking_source: string;
  created_at: string;
};

export type FormSubmitResult = {
  status: "sent" | "awaiting_activation" | "failed" | "disabled";
  responseStatus: number | null;
  response: Record<string, unknown>;
  error: string | null;
};

function safePayload(payload: unknown) {
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
}

export async function sendFormSubmitBooking(appointment: FormSubmitAppointment): Promise<FormSubmitResult> {
  const recipient = process.env.FORMSUBMIT_RECIPIENT_EMAIL?.trim() || businessConfig.bookingEmail;
  if (process.env.FORMSUBMIT_ENABLED === "false") return { status: "disabled", responseStatus: null, response: {}, error: "FormSubmit is disabled." };
  const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`;
  const start = new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(appointment.starts_at));
  const addons = Array.isArray(appointment.addon_snapshot) ? appointment.addon_snapshot.map((item) => typeof item === "object" && item ? String((item as Record<string, unknown>).name ?? "") : "").filter(Boolean).join(", ") : "None";
  const subject = `New Booking: ${appointment.client_name_snapshot} • ${appointment.service_name_snapshot} • ${start}`;
  const form = new FormData();
  form.set("_subject", subject);
  form.set("_template", "table");
  form.set("_captcha", "false");
  form.set("_honey", "");
  form.set("_url", absoluteUrl("/book"));
  if (appointment.client_email_snapshot) form.set("email", appointment.client_email_snapshot);
  form.set("Booking reference", appointment.public_reference);
  form.set("Client name", appointment.client_name_snapshot);
  form.set("Client email", appointment.client_email_snapshot ?? "Not provided");
  form.set("Client phone", appointment.client_phone_snapshot ?? "Not provided");
  form.set("Service", appointment.service_name_snapshot);
  form.set("Add-ons", addons || "None");
  form.set("Barber", appointment.barber_name_snapshot);
  form.set("Date and time", start);
  form.set("Duration", `${Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000)} minutes`);
  form.set("Booking status", appointment.status);
  form.set("Deposit status", appointment.deposit_status);
  form.set("Client notes", appointment.client_notes ?? "None");
  form.set("Booking source", appointment.booking_source);
  form.set("CRM appointment", absoluteUrl(`/admin/appointments?reference=${encodeURIComponent(appointment.public_reference)}`));
  form.set("Submitted", appointment.created_at);
  form.set("Location", `${businessConfig.address.line1}, ${businessConfig.address.city}, ${businessConfig.address.region} ${businessConfig.address.postalCode}`);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json", "User-Agent": "LuxuryBarberLounge-Booking/1.0" }, body: form, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const payload = safePayload(await response.json().catch(() => ({})));
    const message = String(payload.message ?? payload.Message ?? "");
    const awaitingActivation = /activate|activation|confirm.*email|confirmation.*email/i.test(message);
    if (response.ok) return { status: awaitingActivation ? "awaiting_activation" : "sent", responseStatus: response.status, response: { success: payload.success ?? true, message: message.slice(0, 500) }, error: null };
    return { status: "failed", responseStatus: response.status, response: { success: payload.success ?? false, message: message.slice(0, 500) }, error: message.slice(0, 500) || `FormSubmit returned HTTP ${response.status}.` };
  } catch (error) {
    return { status: "failed", responseStatus: null, response: {}, error: error instanceof Error ? error.message.slice(0, 500) : "FormSubmit request failed." };
  }
}
