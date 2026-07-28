import Link from "next/link";
import { CalendarDays, Phone, MapPin } from "lucide-react";
import { business } from "@/lib/content/site";

/** Persistent mobile action bar. Phone number comes from config — never hard-coded. */
export function MobileActions() {
  return (
    <div className="mobile-actions md:hidden">
      <Link href="/visit">
        <MapPin />
        Visit
      </Link>
      <a href={business.phoneHref}>
        <Phone />
        Call
      </a>
      <Link href="/book" className="primary">
        <CalendarDays />
        Book
      </Link>
    </div>
  );
}
