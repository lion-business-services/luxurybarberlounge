import "server-only";

import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { BookingCatalogError, getBookingAdminContext } from "@/lib/booking/catalog";
import { composeFamilyBooking, type FamilyComposition } from "@/lib/booking/family";
import {
  BLOCKING_STATUSES,
  BREAK_BLOCKING_STATUS,
  COMPLETED_STATUS,
  MAXIMUM_ADVANCE_DAYS,
  MINIMUM_LEAD_MINUTES,
  SCHEDULING_SOURCE_OF_TRUTH,
  SLOT_GRID_MINUTES,
  TIME_OFF_BLOCKING_KIND,
  TIME_OFF_BLOCKING_STATUS,
  appointmentOccupancy,
  minutes,
  resolveBufferMinutes,
} from "@/lib/booking/rules";
import {
  evaluatePlacement,
  generateStartTimes,
  scheduleWindowsForDate,
  shopDayFor,
  toUtcWindows,
  type BookingBlock,
  type HardBlock,
  type Interval,
  type PlacementResult,
  type ScheduleRow,
} from "@/lib/booking/slots";
import { addDays, dateInZone, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import type { AvailabilitySlot, BookingCatalog } from "@/lib/booking/types";

/**
 * The ONE availability engine.
 *
 * Supabase is the scheduling source of truth (see src/lib/booking/rules.ts).
 * Every surface calls into this module, which loads the facts once per request
 * and delegates every decision to the pure slot engine in slots.ts:
 *
 *   public booking page ........ searchSupabaseAvailability()
 *   booking submit guard ....... searchSupabaseAvailability()
 *   guest / client reschedule .. checkPlacement()
 *   admin calendar move ........ checkPlacement() for the message, then the
 *                                reschedule_appointment_atomic RPC decides
 *
 * The Postgres guard (migration 202610020001) enforces the same rules again
 * inside the transaction, so nothing here can create a double booking.
 */

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

/** High enough that a full day for every barber is never silently truncated. */
const MAX_SLOTS_PER_RESPONSE = 2000;

export type ScheduleContext = {
  source: typeof SCHEDULING_SOURCE_OF_TRUTH;
  timezone: string;
  bufferMinutes: number;
  nowMs: number;
  dates: string[];
  barbers: Map<string, { windowsByDate: Map<string, Interval[]>; bookings: BookingBlock[]; hardBlocks: HardBlock[] }>;
};

export type ScheduleContextInput = {
  locationId: string;
  timezone: string;
  barberIds: string[];
  startDate: string;
  days: number;
  /** The appointment being moved must not block its own destination. */
  excludeAppointmentId?: string;
  nowMs?: number;
};

/**
 * Loads everything that can affect availability for the given barbers and
 * dates in one round of parallel queries (no per-barber or per-day queries).
 */
export async function loadScheduleContext(admin: AdminClient, input: ScheduleContextInput): Promise<ScheduleContext> {
  const nowMs = input.nowMs ?? Date.now();
  const endDate = addDays(input.startDate, input.days);
  const rangeStart = zonedDateTimeToUtc(input.startDate, "00:00:00", input.timezone);
  const rangeEnd = zonedDateTimeToUtc(endDate, "00:00:00", input.timezone);
  // Appointments just outside the range can still matter through the buffer.
  const queryStart = new Date(rangeStart.getTime() - minutes(120)).toISOString();
  const queryEnd = new Date(rangeEnd.getTime() + minutes(120)).toISOString();
  const barberIds = input.barberIds.length ? input.barberIds : ["00000000-0000-0000-0000-000000000000"];

  const [businessHours, holidayHours, schedules, breaks, timeOff, appointments, holds, settings] = await Promise.all([
    admin.from("business_hours").select("weekday,opens_at,closes_at,closed").eq("location_id", input.locationId),
    admin
      .from("holiday_hours")
      .select("service_date,opens_at,closes_at,closed")
      .eq("location_id", input.locationId)
      .gte("service_date", input.startDate)
      .lt("service_date", endDate),
    admin
      .from("barber_schedules")
      .select("barber_profile_id,weekday,starts_at,ends_at,effective_from,effective_to,active")
      .in("barber_profile_id", barberIds)
      .eq("location_id", input.locationId)
      .eq("active", true),
    admin
      .from("barber_breaks")
      .select("id,barber_profile_id,starts_at,ends_at,status")
      .in("barber_profile_id", barberIds)
      .lt("starts_at", queryEnd)
      .gt("ends_at", queryStart)
      .eq("status", BREAK_BLOCKING_STATUS),
    admin
      .from("barber_time_off")
      .select("id,barber_profile_id,starts_at,ends_at,status,availability_kind")
      .in("barber_profile_id", barberIds)
      .lt("starts_at", queryEnd)
      .gt("ends_at", queryStart)
      .eq("status", TIME_OFF_BLOCKING_STATUS)
      .eq("availability_kind", TIME_OFF_BLOCKING_KIND),
    admin
      .from("appointments")
      .select("id,barber_profile_id,starts_at,ends_at,status,deposit_status,hold_expires_at,completed_at")
      .in("barber_profile_id", barberIds)
      .lt("starts_at", queryEnd)
      .gt("ends_at", queryStart)
      .in("status", [...BLOCKING_STATUSES, COMPLETED_STATUS]),
    admin
      .from("slot_holds")
      .select("id,barber_profile_id,starts_at,ends_at,status,expires_at")
      .in("barber_profile_id", barberIds)
      .lt("starts_at", queryEnd)
      .gt("ends_at", queryStart)
      .eq("status", "active")
      .gt("expires_at", new Date(nowMs).toISOString()),
    admin.from("location_settings").select("default_buffer_minutes").eq("location_id", input.locationId).maybeSingle(),
  ]);

  const failed = [businessHours, holidayHours, schedules, breaks, timeOff, appointments, holds, settings].find((result) => result.error);
  if (failed?.error) {
    console.error("booking-availability-lookup", { code: failed.error.code, message: failed.error.message?.slice(0, 240) });
    throw new BookingCatalogError("BOOKING_MIGRATIONS_REQUIRED");
  }

  const bufferMinutes = resolveBufferMinutes(settings.data?.default_buffer_minutes);
  const dates = Array.from({ length: input.days }, (_, index) => addDays(input.startDate, index));
  const scheduleRows = (schedules.data ?? []) as ScheduleRow[];
  const barbers: ScheduleContext["barbers"] = new Map();

  for (const barberId of input.barberIds) {
    const windowsByDate = new Map<string, Interval[]>();
    for (const date of dates) {
      const weekday = weekdayForDate(date);
      const shop = shopDayFor(date, weekday, businessHours.data ?? [], holidayHours.data ?? []);
      windowsByDate.set(date, toUtcWindows(date, scheduleWindowsForDate(scheduleRows, barberId, weekday, date, shop), input.timezone));
    }

    const bookings: BookingBlock[] = [];
    for (const row of appointments.data ?? []) {
      if (row.barber_profile_id !== barberId || row.id === input.excludeAppointmentId) continue;
      const occupancy = appointmentOccupancy(row, nowMs);
      if (occupancy) bookings.push({ ...occupancy, id: String(row.id) });
    }
    for (const row of holds.data ?? []) {
      if (row.barber_profile_id !== barberId) continue;
      bookings.push({ kind: "hold", id: String(row.id), startMs: new Date(row.starts_at).getTime(), endMs: new Date(row.ends_at).getTime() });
    }

    const hardBlocks: HardBlock[] = [
      ...(timeOff.data ?? []).filter((row) => row.barber_profile_id === barberId).map((row) => ({ kind: "time_off" as const, id: String(row.id), startMs: new Date(row.starts_at).getTime(), endMs: new Date(row.ends_at).getTime() })),
      ...(breaks.data ?? []).filter((row) => row.barber_profile_id === barberId).map((row) => ({ kind: "break" as const, id: String(row.id), startMs: new Date(row.starts_at).getTime(), endMs: new Date(row.ends_at).getTime() })),
    ];

    barbers.set(barberId, { windowsByDate, bookings, hardBlocks });
  }

  return { source: SCHEDULING_SOURCE_OF_TRUTH, timezone: input.timezone, bufferMinutes, nowMs, dates, barbers };
}

function bounds(context: ScheduleContext) {
  return {
    earliestMs: context.nowMs + minutes(MINIMUM_LEAD_MINUTES),
    latestMs: context.nowMs + minutes(MAXIMUM_ADVANCE_DAYS * 24 * 60),
  };
}

/**
 * Decides one exact placement for one barber using an already loaded context.
 * ignorePast is only for handing an appointment to another barber at its
 * existing time, which must stay possible after the appointment has started.
 */
export function evaluateInContext(context: ScheduleContext, barberId: string, startsAt: string, durationMinutes: number, options: { ignorePast?: boolean } = {}): PlacementResult {
  const barber = context.barbers.get(barberId);
  const startMs = new Date(startsAt).getTime();
  if (!barber || !Number.isFinite(startMs)) return { ok: false, reason: "outside_schedule" };
  const date = dateInZone(new Date(startMs), context.timezone);
  return evaluatePlacement({
    startMs,
    durationMinutes,
    bufferMinutes: context.bufferMinutes,
    windows: barber.windowsByDate.get(date) ?? [],
    bookings: barber.bookings,
    hardBlocks: barber.hardBlocks,
    ...(options.ignorePast ? { latestMs: bounds(context).latestMs } : bounds(context)),
  });
}

/**
 * Validates moving or placing one appointment at an exact time. Used by the
 * guest, client and admin reschedule paths so they report the same reason the
 * database guard would give.
 */
export async function checkPlacement(admin: AdminClient, input: {
  locationId: string;
  timezone: string;
  barberId: string;
  startsAt: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
  ignorePast?: boolean;
}): Promise<PlacementResult & { bufferMinutes: number }> {
  const startDate = dateInZone(new Date(input.startsAt), input.timezone);
  const context = await loadScheduleContext(admin, {
    locationId: input.locationId,
    timezone: input.timezone,
    barberIds: [input.barberId],
    startDate,
    days: 1,
    excludeAppointmentId: input.excludeAppointmentId,
  });
  return { ...evaluateInContext(context, input.barberId, input.startsAt, input.durationMinutes, { ignorePast: input.ignorePast }), bufferMinutes: context.bufferMinutes };
}

/**
 * Every valid start for placing one booking of a given length on one barber's
 * day. Used by the staff "move appointment" picker, with the appointment being
 * moved excluded so it does not block its own new time.
 */
export async function listPlacements(admin: AdminClient, input: {
  locationId: string;
  timezone: string;
  barberId: string;
  date: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
}): Promise<{ bufferMinutes: number; starts: string[] }> {
  const context = await loadScheduleContext(admin, {
    locationId: input.locationId,
    timezone: input.timezone,
    barberIds: [input.barberId],
    startDate: input.date,
    days: 1,
    excludeAppointmentId: input.excludeAppointmentId,
  });
  const barber = context.barbers.get(input.barberId);
  if (!barber) return { bufferMinutes: context.bufferMinutes, starts: [] };
  const starts = generateStartTimes({
    durationMinutes: input.durationMinutes,
    bufferMinutes: context.bufferMinutes,
    gridMinutes: SLOT_GRID_MINUTES,
    windows: barber.windowsByDate.get(input.date) ?? [],
    bookings: barber.bookings,
    hardBlocks: barber.hardBlocks,
    ...bounds(context),
  });
  return { bufferMinutes: context.bufferMinutes, starts: starts.map((value) => new Date(value).toISOString()) };
}

export type AvailabilitySearchInput = {
  locationId: string;
  serviceId: string;
  addonIds?: string[];
  durationMinutesOverride?: number;
  barberIds?: string[];
  startDate: string;
  days: number;
  /** Family booking: serviceId is the adult's service and this is the number of Kids Haircuts (1-5). */
  familyChildren?: number;
  excludeAppointmentId?: string;
};

export type AvailabilitySearchResult = {
  source: typeof SCHEDULING_SOURCE_OF_TRUTH;
  slots: AvailabilitySlot[];
  bufferMinutes: number;
  durationMinutes: number;
  family: FamilyComposition | null;
};

const EMPTY = (bufferMinutes = resolveBufferMinutes(undefined)): AvailabilitySearchResult => ({
  source: SCHEDULING_SOURCE_OF_TRUTH,
  slots: [],
  bufferMinutes,
  durationMinutes: 0,
  family: null,
});

/** Resolves the family composition for an adult service from the live catalog. */
export function resolveFamilyComposition(catalog: BookingCatalog, adultServiceId: string, familyChildren: number, bufferMinutes: number): FamilyComposition | null {
  const tier = catalog.family.tiers.find((item) => item.childrenCount === familyChildren);
  const adult = catalog.services.find((item) => item.id === adultServiceId);
  const child = tier ? catalog.services.find((item) => item.id === tier.childServiceId) : undefined;
  if (!tier || !adult || !child || !adult.familyAdultEligible || adult.id === child.id) return null;
  try {
    return composeFamilyBooking({ adult, child, childCount: familyChildren, bufferMinutes });
  } catch {
    return null;
  }
}

/**
 * Bookable start times for a service (or a whole family sequence) from the
 * Supabase scheduling records. A family start is returned only when the entire
 * consecutive sequence fits.
 */
export async function searchSupabaseAvailability(input: AvailabilitySearchInput): Promise<AvailabilitySearchResult> {
  const { admin, catalog } = await getBookingAdminContext();
  if (input.locationId !== catalog.location.id) return EMPTY();

  const service = catalog.services.find((item) => item.id === input.serviceId);
  if (!service) return EMPTY();

  const addonIds = input.addonIds ?? [];
  const addons = catalog.addons.filter((item) => addonIds.includes(item.id));
  if (input.durationMinutesOverride === undefined && addons.length !== addonIds.length) return EMPTY();

  const requiredServiceIds = [service.id];
  let childService: BookingCatalog["services"][number] | undefined;
  if (input.familyChildren) {
    // Family bookings never combine with add-ons; the composition is fixed.
    const tier = catalog.family.tiers.find((item) => item.childrenCount === input.familyChildren);
    childService = tier ? catalog.services.find((item) => item.id === tier.childServiceId) : undefined;
    if (addonIds.length || !tier || !childService || !service.familyAdultEligible || childService.id === service.id) return EMPTY();
    requiredServiceIds.push(childService.id);
  }

  const eligible = catalog.barbers.filter(
    (barber) =>
      requiredServiceIds.every((id) => barber.serviceIds.includes(id)) &&
      (!input.barberIds?.length || input.barberIds.includes(barber.id)),
  );
  if (!eligible.length) return EMPTY();

  const context = await loadScheduleContext(admin, {
    locationId: input.locationId,
    timezone: catalog.location.timezone,
    barberIds: eligible.map((item) => item.id),
    startDate: input.startDate,
    days: input.days,
    excludeAppointmentId: input.excludeAppointmentId,
  });

  // The family sequence is composed with the live buffer setting, the same
  // value the database uses when it re-derives the composition at creation.
  let family: FamilyComposition | null = null;
  if (input.familyChildren && childService) {
    try {
      family = composeFamilyBooking({ adult: service, child: childService, childCount: input.familyChildren, bufferMinutes: context.bufferMinutes });
    } catch {
      return EMPTY(context.bufferMinutes);
    }
  }

  const durationMinutes = family
    ? family.totalDurationMinutes
    : input.durationMinutesOverride ?? service.durationMinutes + addons.reduce((sum, item) => sum + item.durationMinutes, 0);
  const priceCents = family
    ? family.totalPriceCents
    : service.priceCents + addons.reduce((sum, item) => sum + item.priceCents, 0);

  const slots: AvailabilitySlot[] = [];
  for (const barber of eligible) {
    const state = context.barbers.get(barber.id);
    if (!state) continue;
    for (const date of context.dates) {
      const windows = state.windowsByDate.get(date) ?? [];
      if (!windows.length) continue;
      const starts = generateStartTimes({
        windows,
        durationMinutes,
        bufferMinutes: context.bufferMinutes,
        gridMinutes: SLOT_GRID_MINUTES,
        bookings: state.bookings,
        hardBlocks: state.hardBlocks,
        ...bounds(context),
      });
      for (const startMs of starts) {
        const startsAt = new Date(startMs).toISOString();
        slots.push({
          id: `${barber.id}-${startsAt}`,
          startsAt,
          endsAt: new Date(startMs + minutes(durationMinutes)).toISOString(),
          barberId: barber.id,
          barberName: barber.name,
          serviceId: service.id,
          durationMinutes,
          estimatedPriceCents: priceCents,
        });
      }
    }
  }

  return {
    source: SCHEDULING_SOURCE_OF_TRUTH,
    bufferMinutes: context.bufferMinutes,
    durationMinutes,
    family,
    slots: slots
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.barberName.localeCompare(b.barberName))
      .slice(0, MAX_SLOTS_PER_RESPONSE),
  };
}
