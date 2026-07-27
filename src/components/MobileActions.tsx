import Link from "next/link";
import { CalendarDays, Phone, MapPin } from "lucide-react";
export function MobileActions(){return <div className="mobile-actions md:hidden"><Link href="/visit"><MapPin/>Visit</Link><a href="tel:+10000000000"><Phone/>Call</a><Link href="/book" className="primary"><CalendarDays/>Book</Link></div>}
