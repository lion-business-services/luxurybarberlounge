import type { Bi } from "@/lib/content/site";

export type AutomationChannel = "email" | "sms" | "in_app";
export type AutomationTrigger =
  | "booking_created"
  | "booking_reminder_48h"
  | "booking_reminder_24h"
  | "booking_cancelled"
  | "queue_joined"
  | "queue_ready"
  | "service_completed"
  | "client_lapsed"
  | "birthday"
  | "dispute_created"
  | "settlement_ready"
  | "webhook_failed";

export type AutomationDefinition = {
  key: string;
  trigger: AutomationTrigger;
  channel: AutomationChannel;
  transactional: boolean;
  delayMinutes: number;
  subject?: Bi;
  body: Bi;
  enabledByDefault: boolean;
};

export const automationCatalog: AutomationDefinition[] = [
  {
    key: "booking_confirmation_email",
    trigger: "booking_created",
    channel: "email",
    transactional: true,
    delayMinutes: 0,
    enabledByDefault: true,
    subject: { en: "Your Luxury Barber Lounge appointment", es: "Tu cita en Luxury Barber Lounge" },
    body: {
      en: "{{client_first_name}}, your appointment with {{barber_name}} is reserved for {{appointment_time}}. Review the address, parking, deposit, and policies in your confirmation link: {{manage_url}}.",
      es: "{{client_first_name}}, tu cita con {{barber_name}} está reservada para {{appointment_time}}. Revisa dirección, estacionamiento, depósito y políticas aquí: {{manage_url}}.",
    },
  },
  {
    key: "booking_confirmation_sms",
    trigger: "booking_created",
    channel: "sms",
    transactional: true,
    delayMinutes: 0,
    enabledByDefault: true,
    body: {
      en: "Luxury Barber Lounge: {{service_name}} with {{barber_name}} on {{appointment_time}}. Manage: {{manage_url}} Reply STOP to opt out of non-essential texts.",
      es: "Luxury Barber Lounge: {{service_name}} con {{barber_name}} el {{appointment_time}}. Gestiona: {{manage_url}} Responde STOP para salir de mensajes no esenciales.",
    },
  },
  {
    key: "reminder_24h_sms",
    trigger: "booking_reminder_24h",
    channel: "sms",
    transactional: true,
    delayMinutes: 0,
    enabledByDefault: true,
    body: {
      en: "Reminder: your Luxury Barber Lounge appointment is tomorrow at {{appointment_time}}. Confirm or manage: {{manage_url}}.",
      es: "Recordatorio: tu cita en Luxury Barber Lounge es mañana a las {{appointment_time}}. Confirma o gestiona: {{manage_url}}.",
    },
  },
  {
    key: "queue_ready_sms",
    trigger: "queue_ready",
    channel: "sms",
    transactional: true,
    delayMinutes: 0,
    enabledByDefault: true,
    body: {
      en: "Your barber is nearly ready. Please return to the lounge and check in at reception. Queue status: {{queue_url}}.",
      es: "Tu barbero está casi listo. Regresa al salón y regístrate en recepción. Estado: {{queue_url}}.",
    },
  },
  {
    key: "post_service_feedback",
    trigger: "service_completed",
    channel: "email",
    transactional: false,
    delayMinutes: 120,
    enabledByDefault: true,
    subject: { en: "How was your visit?", es: "¿Cómo fue tu visita?" },
    body: {
      en: "Thank you for visiting Luxury Barber Lounge. Share private feedback here: {{feedback_url}}. Your response goes directly to management.",
      es: "Gracias por visitar Luxury Barber Lounge. Comparte comentarios privados aquí: {{feedback_url}}. Tu respuesta llega directamente a gerencia.",
    },
  },
  {
    key: "settlement_ready_barber",
    trigger: "settlement_ready",
    channel: "email",
    transactional: true,
    delayMinutes: 0,
    enabledByDefault: true,
    subject: { en: "Your weekly statement is ready", es: "Tu estado semanal está listo" },
    body: {
      en: "Your statement for {{period_label}} is ready. Review transactions, attribution, tips, adjustments, and the dispute deadline in the barber portal.",
      es: "Tu estado para {{period_label}} está listo. Revisa transacciones, atribución, propinas, ajustes y la fecha límite en el portal.",
    },
  },
];
