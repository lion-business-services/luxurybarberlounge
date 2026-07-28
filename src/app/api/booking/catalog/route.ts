import { NextResponse } from "next/server";
import { getBookingProvider } from "@/lib/booking";

export async function GET() {
  const provider = getBookingProvider();
  const [locations, services, teamMembers] = await Promise.all([
    provider.listLocations(),
    provider.listServices(),
    provider.listTeamMembers(),
  ]);
  return NextResponse.json({ mode: provider.mode, live: provider.mode !== "development", locations, services, teamMembers });
}
