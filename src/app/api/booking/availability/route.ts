import { NextResponse } from "next/server";
import { getBookingProvider } from "@/lib/booking";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  const locationId = typeof body.locationId === "string" ? body.locationId : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
  const startAt = typeof body.startAt === "string" ? body.startAt : "";
  const endAt = typeof body.endAt === "string" ? body.endAt : "";
  if (!locationId || !serviceId || !startAt || !endAt) return NextResponse.json({ message: "Location, service, and date range are required." }, { status: 422 });
  const provider = getBookingProvider();
  const availability = await provider.searchAvailability({ locationId, serviceId, startAt, endAt, teamMemberIds: Array.isArray(body.teamMemberIds) ? body.teamMemberIds.filter((value): value is string => typeof value === "string") : undefined });
  return NextResponse.json({ mode: provider.mode, live: provider.mode !== "development", availability, notice: provider.mode === "development" ? "Preview slots are not live availability." : undefined });
}
