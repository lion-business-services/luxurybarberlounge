import { features } from "../config/features.ts";
import { squareIsConfigured } from "../square/config.ts";
import { DevelopmentBookingProvider } from "./development.ts";
import type { BookingProvider } from "./provider.ts";
import { SquareBookingProvider } from "./square.ts";

export function getBookingProvider(): BookingProvider {
  if (features.squareBookings && squareIsConfigured) return new SquareBookingProvider();
  return new DevelopmentBookingProvider();
}

export type * from "./provider.ts";
