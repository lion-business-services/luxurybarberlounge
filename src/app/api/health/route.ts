import { NextResponse } from "next/server";
import { environment } from "@/lib/config/environment";
import { features } from "@/lib/config/features";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    release: "12.0.0",
    features: {
      publicWebsite: true,
      bookingMode: features.squareBookings && environment.squareConfigured ? "square" : "development",
      queue: features.walkInQueue,
      memberships: features.memberships,
      portalDemo: features.portalDemoMode,
    },
    integrations: {
      square: environment.squareConfigured ? "configured" : "awaiting_credentials",
      supabase: environment.supabaseConfigured ? "configured" : "awaiting_credentials",
      email: environment.emailConfigured ? "configured" : "development",
      sms: environment.smsConfigured ? "configured" : "development",
      ai: environment.aiConfigured ? "configured" : "grounded_fallback",
    },
  });
}
