import { NextResponse } from "next/server";
import { environment } from "@/lib/config/environment";
import { features } from "@/lib/config/features";

export async function GET() {
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    providers: {
      supabase: { configured: environment.supabaseConfigured, adminConfigured: environment.supabaseAdminConfigured },
      square: { configured: environment.squareConfigured, webhooksConfigured: environment.squareWebhookConfigured, enabled: features.squareBookings },
      email: { configured: environment.emailConfigured },
      sms: { configured: environment.smsConfigured, enabled: features.sms },
      ai: { configured: environment.aiConfigured, enabled: features.aiConcierge },
    },
  });
}
