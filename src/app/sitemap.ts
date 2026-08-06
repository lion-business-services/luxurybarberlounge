import type { MetadataRoute } from "next";
import { barbers, business, journalPosts, services } from "@/lib/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/services", "/barbers", "/book", "/walk-ins", "/membership", "/packages", "/gift-cards", "/gallery", "/reviews", "/about", "/events", "/weddings", "/products", "/careers", "/contact", "/faq", "/journal", "/locations", "/visit", "/policies", "/policies/booking", "/policies/cancellation", "/policies/deposits", "/policies/no-show", "/policies/refund", "/policies/membership", "/privacy", "/terms", "/sms-terms", "/accessibility", "/cookies"];
  const now = new Date();
  return [
    ...staticRoutes.map((route) => ({ url: `${business.domain}${route}`, lastModified: now, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/book" ? 0.95 : 0.7 })),
    ...services.map((service) => ({ url: `${business.domain}/services/${service.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...barbers.filter((barber) => barber.active).map((barber) => ({ url: `${business.domain}/barbers/${barber.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...journalPosts.map((post) => ({ url: `${business.domain}/journal/${post.slug}`, lastModified: new Date(post.publishedAt), changeFrequency: "yearly" as const, priority: 0.55 })),
    { url: `${business.domain}/locations/northfield`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
  ];
}
