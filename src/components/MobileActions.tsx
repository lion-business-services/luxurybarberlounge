"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Phone, MapPin } from "lucide-react";
import { business } from "@/lib/content/site";

export function MobileActions() {
  const pathname = usePathname();
  if (/^\/(client|barber|reception|admin|kiosk)(?:\/|$)/.test(pathname) || ["/login", "/register", "/forgot-password"].includes(pathname)) return null;
  return (
    <div className="mobile-actions md:hidden">
      <Link href="/visit"><MapPin />Visit</Link>
      <a href={business.phoneHref}><Phone />Call</a>
      <Link href="/book" className="primary"><CalendarDays />Book</Link>
    </div>
  );
}
