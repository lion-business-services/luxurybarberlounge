import type { MetadataRoute } from "next";
import { business } from "@/lib/content/site";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/client/", "/barber/", "/reception/", "/kiosk/", "/api/"] }, sitemap: `${business.domain}/sitemap.xml`, host: business.domain }; }
