export type BookingCatalogService = {
  id: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  preparation: string;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
  relatedServiceIds: string[];
};

export type BookingCatalogAddon = {
  id: string;
  slug: string;
  serviceId: string | null;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
};

export type BookingCatalogBarber = {
  id: string;
  slug: string;
  name: string;
  portrait: string | null;
  title: string;
  biography: string;
  specialties: string[];
  languages: string[];
  serviceIds: string[];
  demo: boolean;
};

export type BookingCatalog = {
  source: "supabase" | "square";
  location: {
    id: string;
    name: string;
    timezone: string;
    address: string;
  };
  categories: Array<{ id: string; slug: string; name: string; description: string }>;
  services: BookingCatalogService[];
  addons: BookingCatalogAddon[];
  barbers: BookingCatalogBarber[];
};

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  durationMinutes: number;
  estimatedPriceCents: number;
};

export type BookingConfirmation = {
  id: string;
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  barberName: string;
  locationName: string;
  locationAddress: string;
  durationMinutes: number;
  estimatedPriceCents: number;
  depositCents: number;
  manageToken: string;
  notificationState: string;
};
