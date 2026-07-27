export type AutomationTrigger = "booking.created" | "booking.reminder" | "appointment.completed" | "queue.joined" | "queue.ready" | "review.request";
export type AutomationRule = { id:string; trigger:AutomationTrigger; channel:"email"|"sms"|"internal"; delayMinutes:number; enabled:boolean; template:string };
export const automationRules: AutomationRule[] = [
 {id:"booking-confirmation",trigger:"booking.created",channel:"email",delayMinutes:0,enabled:true,template:"booking-confirmation"},
 {id:"booking-sms",trigger:"booking.created",channel:"sms",delayMinutes:0,enabled:true,template:"booking-confirmation-sms"},
 {id:"appointment-reminder",trigger:"booking.reminder",channel:"sms",delayMinutes:0,enabled:true,template:"appointment-reminder"},
 {id:"queue-ready",trigger:"queue.ready",channel:"sms",delayMinutes:0,enabled:true,template:"queue-ready"},
 {id:"review-request",trigger:"appointment.completed",channel:"email",delayMinutes:120,enabled:true,template:"review-request"},
];
