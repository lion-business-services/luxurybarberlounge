export type BookingLocation = {
  id: string;
  name: string;
  timezone: string;
  address: string;
  live: boolean;
};

export type BookingService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
  live: boolean;
};

export type BookingTeamMember = {
  id: string;
  slug: string;
  displayName: string;
  serviceIds: string[];
  live: boolean;
};

export type BookingAvailability = {
  id: string;
  startsAt: string;
  endsAt: string;
  locationId: string;
  teamMemberId: string;
  serviceId: string;
  live: boolean;
};

export type BookingCustomerInput = {
  givenName: string;
  familyName?: string;
  email?: string;
  phone?: string;
  idempotencyKey: string;
};

export type BookingInput = {
  locationId: string;
  serviceId: string;
  teamMemberId?: string;
  customerId: string;
  startsAt: string;
  notes?: string;
  idempotencyKey: string;
};

export type BookingRecord = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
  startsAt: string;
  locationId: string;
  serviceId: string;
  teamMemberId?: string;
  customerId: string;
  live: boolean;
  manageUrl?: string;
};

export type BookingPaymentStatus = {
  bookingId: string;
  status: "NOT_REQUIRED" | "PENDING" | "PAID" | "REFUNDED" | "UNKNOWN";
  amountCents: number;
  live: boolean;
};

export interface BookingProvider {
  readonly mode: "development" | "square-sandbox" | "square-production";
  listLocations(): Promise<BookingLocation[]>;
  listServices(locationId?: string): Promise<BookingService[]>;
  listTeamMembers(locationId?: string, serviceId?: string): Promise<BookingTeamMember[]>;
  searchAvailability(input: {
    locationId: string;
    serviceId: string;
    startAt: string;
    endAt: string;
    teamMemberIds?: string[];
  }): Promise<BookingAvailability[]>;
  createCustomer(input: BookingCustomerInput): Promise<{ id: string; live: boolean }>;
  createBooking(input: BookingInput): Promise<BookingRecord>;
  updateBooking(id: string, patch: Partial<Pick<BookingInput, "startsAt" | "teamMemberId" | "notes">>, idempotencyKey: string): Promise<BookingRecord>;
  cancelBooking(id: string, idempotencyKey: string): Promise<BookingRecord>;
  getBooking(id: string): Promise<BookingRecord | null>;
  getPaymentStatus(bookingId: string): Promise<BookingPaymentStatus>;
}
