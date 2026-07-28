import { randomUUID } from "node:crypto";
import { barbers, business, services } from "../content/site.ts";
import type {
  BookingAvailability,
  BookingInput,
  BookingLocation,
  BookingProvider,
  BookingRecord,
  BookingService,
  BookingTeamMember,
} from "./provider.ts";

const bookings = new Map<string, BookingRecord>();

export class DevelopmentBookingProvider implements BookingProvider {
  readonly mode = "development" as const;

  async listLocations(): Promise<BookingLocation[]> {
    return [{
      id: "northfield-demo",
      name: "Northfield Lounge",
      timezone: business.timezone,
      address: `${business.street}, ${business.city}, ${business.state} ${business.postalCode}`,
      live: false,
    }];
  }

  async listServices(): Promise<BookingService[]> {
    return services.map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name.en,
      description: item.blurb.en,
      durationMinutes: item.minutes,
      priceCents: item.from * 100,
      depositCents: item.deposit * 100,
      live: false,
    }));
  }

  async listTeamMembers(_locationId?: string, serviceId?: string): Promise<BookingTeamMember[]> {
    return barbers
      .filter((item) => !serviceId || item.serviceSlugs.includes(serviceId))
      .map((item) => ({
        id: item.slug,
        slug: item.slug,
        displayName: item.name,
        serviceIds: item.serviceSlugs,
        live: false,
      }));
  }

  async searchAvailability(input: {
    locationId: string;
    serviceId: string;
    startAt: string;
    endAt: string;
    teamMemberIds?: string[];
  }): Promise<BookingAvailability[]> {
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];
    const service = services.find((item) => item.slug === input.serviceId);
    if (!service) return [];
    const barbersForService = await this.listTeamMembers(input.locationId, input.serviceId);
    const eligible = input.teamMemberIds?.length
      ? barbersForService.filter((item) => input.teamMemberIds?.includes(item.id))
      : barbersForService;
    const slots: BookingAvailability[] = [];
    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);
    while (cursor < end && slots.length < 18) {
      const hour = cursor.getHours();
      const day = cursor.getDay();
      if (day !== 0 && day !== 1 && hour >= 9 && hour < 18) {
        for (const barber of eligible) {
          const ends = new Date(cursor.getTime() + service.minutes * 60_000);
          slots.push({
            id: `${barber.id}-${cursor.toISOString()}`,
            startsAt: cursor.toISOString(),
            endsAt: ends.toISOString(),
            locationId: input.locationId,
            teamMemberId: barber.id,
            serviceId: input.serviceId,
            live: false,
          });
          if (slots.length >= 18) break;
        }
      }
      cursor.setMinutes(cursor.getMinutes() + 60);
    }
    return slots;
  }

  async createCustomer(): Promise<{ id: string; live: boolean }> {
    return { id: `demo-customer-${randomUUID()}`, live: false };
  }

  async createBooking(input: BookingInput): Promise<BookingRecord> {
    const record: BookingRecord = {
      id: `demo-booking-${randomUUID()}`,
      status: "PENDING",
      startsAt: input.startsAt,
      locationId: input.locationId,
      serviceId: input.serviceId,
      teamMemberId: input.teamMemberId,
      customerId: input.customerId,
      live: false,
    };
    bookings.set(record.id, record);
    return record;
  }

  async updateBooking(id: string, patch: Partial<Pick<BookingInput, "startsAt" | "teamMemberId">>): Promise<BookingRecord> {
    const existing = bookings.get(id);
    if (!existing) throw new Error("Development booking not found.");
    const updated = { ...existing, ...patch };
    bookings.set(id, updated);
    return updated;
  }

  async cancelBooking(id: string): Promise<BookingRecord> {
    const existing = bookings.get(id);
    if (!existing) throw new Error("Development booking not found.");
    const cancelled = { ...existing, status: "CANCELLED" as const };
    bookings.set(id, cancelled);
    return cancelled;
  }

  async getBooking(id: string): Promise<BookingRecord | null> {
    return bookings.get(id) ?? null;
  }

  async getPaymentStatus(bookingId: string) {
    return { bookingId, status: "NOT_REQUIRED" as const, amountCents: 0, live: false };
  }
}
