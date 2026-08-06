import "server-only";
import { businessConfig } from "@/lib/config/business";
import { BookingCatalogError, ensureBookingCatalog } from "@/lib/booking/catalog";
import { addDays, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import type { AvailabilitySlot } from "@/lib/booking/types";

function time(value: string | null | undefined) {
  return value ? value.slice(0, 8) : null;
}

function overlaps(start: Date, end: Date, otherStart: string, otherEnd: string) {
  return start < new Date(otherEnd) && end > new Date(otherStart);
}

export async function searchSupabaseAvailability(input: {
  locationId: string;
  serviceId: string;
  addonIds?: string[];
  durationMinutesOverride?: number;
  barberIds?: string[];
  startDate: string;
  days: number;
}) {
  const { admin, catalog } = await ensureBookingCatalog();
  if (input.locationId !== catalog.location.id) return { source: "supabase" as const, slots: [] as AvailabilitySlot[] };
  const service = catalog.services.find((item) => item.id === input.serviceId);
  if (!service) return { source: "supabase" as const, slots: [] as AvailabilitySlot[] };
  const addonIds = input.addonIds ?? [];
  const addons = catalog.addons.filter((item) => addonIds.includes(item.id));
  if (input.durationMinutesOverride === undefined && addons.length !== addonIds.length) {
    return { source: "supabase" as const, slots: [] as AvailabilitySlot[] };
  }
  const durationMinutes = input.durationMinutesOverride ?? (service.durationMinutes + addons.reduce((sum, item) => sum + item.durationMinutes, 0));
  const priceCents = service.priceCents + addons.reduce((sum, item) => sum + item.priceCents, 0);
  const eligible = catalog.barbers.filter((barber) => barber.serviceIds.includes(service.id) && (!input.barberIds?.length || input.barberIds.includes(barber.id)));
  if (!eligible.length) return { source: "supabase" as const, slots: [] as AvailabilitySlot[] };

  const rangeStart = zonedDateTimeToUtc(input.startDate, "00:00:00", catalog.location.timezone);
  const rangeEnd = zonedDateTimeToUtc(addDays(input.startDate, input.days), "00:00:00", catalog.location.timezone);
  const barberIds = eligible.map((item) => item.id);
  const [businessHoursResult, holidayHoursResult, schedulesResult, breaksResult, timeOffResult, appointmentsResult, holdsResult, settingsResult] = await Promise.all([
    admin.from("business_hours").select("weekday,opens_at,closes_at,closed").eq("location_id", input.locationId),
    admin.from("holiday_hours").select("service_date,opens_at,closes_at,closed").eq("location_id", input.locationId).gte("service_date", input.startDate).lt("service_date", addDays(input.startDate, input.days)),
    admin.from("barber_schedules").select("barber_profile_id,weekday,starts_at,ends_at,effective_from,effective_to,active").in("barber_profile_id", barberIds).eq("location_id", input.locationId).eq("active", true),
    admin.from("barber_breaks").select("barber_profile_id,starts_at,ends_at,status").in("barber_profile_id", barberIds).lt("starts_at", rangeEnd.toISOString()).gt("ends_at", rangeStart.toISOString()).neq("status", "cancelled"),
    admin.from("barber_time_off").select("barber_profile_id,starts_at,ends_at,status").in("barber_profile_id", barberIds).lt("starts_at", rangeEnd.toISOString()).gt("ends_at", rangeStart.toISOString()).eq("status", "approved"),
    admin.from("appointments").select("barber_profile_id,starts_at,ends_at,status").in("barber_profile_id", barberIds).lt("starts_at", rangeEnd.toISOString()).gt("ends_at", rangeStart.toISOString()).in("status", ["slot_held", "pending_confirmation", "confirmed", "checked_in", "assigned", "in_service"]),
    admin.from("slot_holds").select("barber_profile_id,starts_at,ends_at,status,expires_at").in("barber_profile_id", barberIds).lt("starts_at", rangeEnd.toISOString()).gt("ends_at", rangeStart.toISOString()).eq("status", "active").gt("expires_at", new Date().toISOString()),
    admin.from("location_settings").select("default_buffer_minutes,settings").eq("location_id", input.locationId).maybeSingle(),
  ]);
  const failedLookup = [businessHoursResult, holidayHoursResult, schedulesResult, breaksResult, timeOffResult, appointmentsResult, holdsResult, settingsResult].find((result) => result.error);
  if (failedLookup?.error) {
    console.error("booking-availability-lookup", { code: failedLookup.error.code, message: failedLookup.error.message?.slice(0, 240) });
    throw new BookingCatalogError("BOOKING_MIGRATIONS_REQUIRED");
  }
  const businessHours = businessHoursResult.data;
  const holidayHours = holidayHoursResult.data;
  const schedules = schedulesResult.data;
  const breaks = breaksResult.data;
  const timeOff = timeOffResult.data;
  const appointments = appointmentsResult.data;
  const holds = holdsResult.data;
  const settings = settingsResult.data;
  const bufferMinutes = Number(settings?.default_buffer_minutes ?? businessConfig.defaultBufferMinutes);
  const now = Date.now();
  const minimum = now + businessConfig.minimumLeadMinutes * 60_000;
  const maximum = now + businessConfig.maximumAdvanceDays * 24 * 60 * 60_000;
  const slots: AvailabilitySlot[] = [];

  for (let dayOffset = 0; dayOffset < input.days; dayOffset += 1) {
    const date = addDays(input.startDate, dayOffset);
    const weekday = weekdayForDate(date);
    const holiday = (holidayHours ?? []).find((item) => item.service_date === date);
    const regular = (businessHours ?? []).find((item) => Number(item.weekday) === weekday);
    if (holiday?.closed || (!holiday && (!regular || regular.closed))) continue;
    const shopOpen = time(holiday?.opens_at ?? regular?.opens_at);
    const shopClose = time(holiday?.closes_at ?? regular?.closes_at);
    if (!shopOpen || !shopClose) continue;

    for (const barber of eligible) {
      const schedule = (schedules ?? []).find((item) => item.barber_profile_id === barber.id && Number(item.weekday) === weekday && item.effective_from <= date && (!item.effective_to || item.effective_to >= date));
      if (!schedule) continue;
      const open = time(schedule.starts_at)! > shopOpen ? time(schedule.starts_at)! : shopOpen;
      const close = time(schedule.ends_at)! < shopClose ? time(schedule.ends_at)! : shopClose;
      let cursor = zonedDateTimeToUtc(date, open, catalog.location.timezone);
      const closeAt = zonedDateTimeToUtc(date, close, catalog.location.timezone);
      while (cursor.getTime() + (durationMinutes + bufferMinutes) * 60_000 <= closeAt.getTime()) {
        const end = new Date(cursor.getTime() + durationMinutes * 60_000);
        const occupiedEnd = new Date(end.getTime() + bufferMinutes * 60_000);
        const unavailable = [...(breaks ?? []), ...(timeOff ?? []), ...(appointments ?? []), ...(holds ?? [])]
          .some((item) => item.barber_profile_id === barber.id && overlaps(cursor, occupiedEnd, item.starts_at, item.ends_at));
        if (!unavailable && cursor.getTime() >= minimum && cursor.getTime() <= maximum) {
          slots.push({
            id: `${barber.id}-${cursor.toISOString()}`,
            startsAt: cursor.toISOString(),
            endsAt: end.toISOString(),
            barberId: barber.id,
            barberName: barber.name,
            serviceId: service.id,
            durationMinutes,
            estimatedPriceCents: priceCents,
          });
        }
        cursor = new Date(cursor.getTime() + businessConfig.slotIntervalMinutes * 60_000);
      }
    }
  }
  return { source: "supabase" as const, slots: slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.barberName.localeCompare(b.barberName)).slice(0, 240) };
}
