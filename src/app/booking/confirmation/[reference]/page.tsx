import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CalendarPlus, CheckCircle2, Clock, MapPin, Phone, Scissors, UserRound } from "lucide-react";
import { getManagedAppointment } from "@/lib/booking/manage";
import { businessConfig } from "@/lib/config/business";
import { GuestAppointmentActions } from "@/components/booking/GuestAppointmentActions";
import { SquareDepositButton } from "@/components/booking/SquareDepositButton";
import { DepositStatusWatcher } from "@/components/booking/DepositStatusWatcher";

export const metadata: Metadata = { title: "Appointment Confirmation", robots: { index: false, follow: false } };

// Payment state is updated by the Square webhook after the client is
// redirected back here, so this page must never be served from cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function BookingConfirmationPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ token?: string }> }) {
  const { reference } = await params;
  const { token = "" } = await searchParams;
  const managed = await getManagedAppointment(reference, token);
  if (!managed) notFound();
  const { appointment, location } = managed;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(appointment.starts_at));
  const address = [location?.address_line_1, location?.city, location?.region, location?.postal_code].filter(Boolean).join(", ");
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", `${appointment.service_name_snapshot} at ${businessConfig.name}`);
  google.searchParams.set("dates", `${new Date(appointment.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}/${new Date(appointment.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
  google.searchParams.set("location", address);
  google.searchParams.set("details", `Barber: ${appointment.barber_name_snapshot}\nReference: ${appointment.public_reference}\nPhone: ${businessConfig.phone}`);
  const calendarPath = `/api/booking/calendar/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`;
  const depositCents = Number(appointment.deposit_required_cents ?? 0);
  const awaitingDeposit = depositCents > 0 && appointment.deposit_status !== "paid" && appointment.status === "pending_confirmation";
  const depositAmount = (depositCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <main className="min-h-screen bg-[var(--color-ink)] px-5 py-16 text-[var(--color-bone)] sm:px-8"><section className="mx-auto max-w-3xl border border-[var(--color-brass)]/30 bg-[var(--color-ink-soft)] p-7 sm:p-12">{awaitingDeposit ? <Clock className="h-10 w-10 text-amber-400" /> : <CheckCircle2 className="h-10 w-10 text-[var(--color-brass)]" />}<p className={`mt-6 text-[10px] tracking-[.3em] uppercase ${awaitingDeposit ? "text-amber-400" : "text-[var(--color-brass)]"}`}>{awaitingDeposit ? "Deposit required \u00b7 not yet confirmed" : "Appointment confirmed"}</p><h1 className="font-display mt-3 text-4xl sm:text-6xl">{awaitingDeposit ? "Almost there." : "Your chair is reserved."}</h1>{awaitingDeposit ? (
      <>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">We are holding this time slot for you, but <strong className="text-amber-300">your appointment is not booked yet</strong>. Pay the {depositAmount} deposit below to confirm it.</p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm leading-6 text-amber-100">If the deposit is not paid, this slot is released and your barber will not be expecting you. You will not receive a confirmation until payment is complete.</p>
        </div>
        <DepositStatusWatcher awaitingDeposit={awaitingDeposit} />
      </>
    ) : (
      <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">Keep your reference number. Confirmation and reminder delivery continue in the background even if an email provider needs a retry.</p>
    )}<div className="mt-8 rounded-xl border border-[var(--color-ink-line)] p-5"><p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Booking reference</p><p className="font-display mt-2 text-3xl">{appointment.public_reference}</p></div><dl className="mt-7 grid gap-4 sm:grid-cols-2"><Detail icon={<Scissors />} label="Service" value={appointment.service_name_snapshot} /><Detail icon={<UserRound />} label="Barber" value={appointment.barber_name_snapshot} /><Detail icon={<CalendarPlus />} label="Date and time" value={date} /><Detail icon={<MapPin />} label="Location" value={address} /></dl><div className={`mt-8 flex-wrap gap-3 ${awaitingDeposit ? "hidden" : "flex"}`}><a href={calendarPath} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black"><CalendarPlus className="h-4 w-4" />Download calendar</a><a href={google.toString()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase">Google Calendar</a><a href={businessConfig.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase">Directions</a><a href={businessConfig.phoneHref} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase"><Phone className="h-4 w-4" />Call</a></div><SquareDepositButton reference={reference} token={token} amountCents={Number(appointment.deposit_required_cents ?? 0)} status={appointment.deposit_status} /><GuestAppointmentActions reference={reference} token={token} startsAt={appointment.starts_at} status={appointment.status} /><div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/login?next=/client/appointments" className="text-[var(--color-brass)] underline underline-offset-4">Access your client portal</Link><Link href="/book" className="text-[var(--color-bone-muted)] underline underline-offset-4">Book another appointment</Link></div></section></main>;
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex gap-3 rounded-xl border border-[var(--color-ink-line)] p-4"><span className="mt-1 text-[var(--color-brass)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><div><dt className="text-[9px] tracking-[.18em] uppercase text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-2 text-sm leading-6">{value}</dd></div></div>; }
