import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CalendarPlus, CheckCircle2, Clock, MapPin, Phone, Scissors, UserRound } from "lucide-react";
import { getManagedAppointment } from "@/lib/booking/manage";
import { CHECKOUT_HOLD_MINUTES, isHoldStatus } from "@/lib/booking/rules";
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
  const { appointment, location, admin } = managed;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(appointment.starts_at));
  const address = [location?.address_line_1, location?.city, location?.region, location?.postal_code].filter(Boolean).join(", ");
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", `${appointment.service_name_snapshot} at ${businessConfig.name}`);
  google.searchParams.set("dates", `${new Date(appointment.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}/${new Date(appointment.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
  google.searchParams.set("location", address);
  google.searchParams.set("details", `Barber: ${appointment.barber_name_snapshot}\nReference: ${appointment.public_reference}\nPhone: ${businessConfig.phone}`);
  const calendarPath = `/api/booking/calendar/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`;

  const requiredPaymentCents = Number(appointment.service_price_snapshot_cents ?? appointment.deposit_required_cents ?? 0);
  const { data: paidLinks } = await admin
    .from("appointment_payment_links")
    .select("amount_cents")
    .eq("appointment_id", appointment.id)
    .eq("status", "paid")
    .in("purpose", ["deposit", "balance"]);
  const paidPrincipalCents = (paidLinks ?? []).reduce((sum, link) => sum + Math.max(0, Number(link.amount_cents ?? 0)), 0);
  const remainingCents = Math.max(0, requiredPaymentCents - paidPrincipalCents);
  // Square can close a checkout for less than the required service payment
  // (a discount code, a cash tender). The booking stays unconfirmed, and the
  // client is told why instead of being left waiting for a payment to appear.
  const { data: openLinks } = await admin
    .from("appointment_payment_links")
    .select("square_order_id")
    .eq("appointment_id", appointment.id)
    .neq("status", "paid")
    .in("purpose", ["deposit", "balance"]);
  const openOrderIds = (openLinks ?? []).map((link) => String(link.square_order_id ?? "")).filter(Boolean);
  const { data: closedCheckouts } = openOrderIds.length
    ? await admin
        .from("square_payments")
        .select("square_id")
        .eq("business_id", appointment.business_id)
        .in("square_order_id", openOrderIds)
        .eq("status", "COMPLETED")
        .limit(1)
    : { data: [] };
  const closedBelowRequired = remainingCents > 0 && (closedCheckouts ?? []).length > 0;
  const released = ["expired", "declined", "failed"].includes(appointment.status);
  // Money was received for a reservation that no longer holds its time. The
  // client must never be told they were not charged.
  const paidButReleased = released && (paidPrincipalCents > 0 || appointment.deposit_status === "paid");
  const cancelled = ["cancelled_by_client", "cancelled_by_business"].includes(appointment.status);
  const noShow = appointment.status === "no_show";
  const completed = appointment.status === "completed";
  const closed = released || cancelled || noShow;
  const awaitingDeposit = !closed && remainingCents > 0 && isHoldStatus(appointment.status);
  const paymentAmount = (remainingCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const holdExpiresAt = typeof appointment.hold_expires_at === "string" ? new Date(appointment.hold_expires_at) : null;
  const holdOpen = isStillAhead(holdExpiresAt);
  const holdTime = holdExpiresAt ? new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, timeStyle: "short" }).format(holdExpiresAt) : null;

  const { data: itemRows } = appointment.booking_kind === "family"
    ? await admin
        .from("appointment_service_items")
        .select("sequence,label,service_name_snapshot,duration_snapshot_minutes,price_snapshot_cents")
        .eq("appointment_id", appointment.id)
        .order("sequence")
    : { data: [] };
  const items = (itemRows ?? []) as Array<{ sequence: number; label: string; service_name_snapshot: string; duration_snapshot_minutes: number; price_snapshot_cents: number }>;
  const totalMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);

  const eyebrow = paidButReleased
    ? "Payment received · action needed"
    : released
    ? "Reservation released"
    : cancelled
      ? "Appointment cancelled"
      : noShow
        ? "Appointment closed"
        : completed
          ? "Visit completed"
          : awaitingDeposit
            ? "Payment required · not yet confirmed"
            : "Appointment confirmed";
  const heading = paidButReleased
    ? "We received your payment."
    : released
    ? "This time is no longer held."
    : cancelled
      ? "This appointment was cancelled."
      : noShow
        ? "This appointment is closed."
        : completed
          ? "Thank you for your visit."
          : awaitingDeposit
            ? "Almost there."
            : "Your chair is reserved.";
  const tone = closed || awaitingDeposit ? "text-amber-400" : "text-[var(--color-brass)]";

  return (
    <main className="min-h-screen bg-[var(--color-ink)] px-5 py-16 text-[var(--color-bone)] sm:px-8">
      <section className="mx-auto max-w-3xl border border-[var(--color-brass)]/30 bg-[var(--color-ink-soft)] p-7 sm:p-12">
        {closed ? <AlertCircle className="h-10 w-10 text-amber-400" /> : awaitingDeposit ? <Clock className="h-10 w-10 text-amber-400" /> : <CheckCircle2 className="h-10 w-10 text-[var(--color-brass)]" />}
        <p className={`mt-6 text-[10px] tracking-[.3em] uppercase ${tone}`}>{eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl sm:text-6xl">{heading}</h1>

        {paidButReleased ? (
          <>
            <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">Your payment arrived after the {CHECKOUT_HOLD_MINUTES}-minute hold on this time had ended, and the time is no longer available. Your payment is safe. The lounge has been notified and will contact you to set a new time or refund you. You can also call {businessConfig.phone}.</p>
            <DepositStatusWatcher awaitingDeposit />
          </>
        ) : released ? (
          <>
            <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">Payment was not completed within {CHECKOUT_HOLD_MINUTES} minutes, so the time was released for other clients. If you did not finish paying, you have not been charged. Choose a new time to book again.</p>
            {closedBelowRequired ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm leading-6 text-amber-100">Your Square checkout was completed, but it did not collect the full service payment by card (for example, a discount code was applied). A website appointment is confirmed only after the full service payment, so this appointment is not confirmed. Please call {businessConfig.phone} and we will help you.</p>
              </div>
            ) : null}
            <DepositStatusWatcher awaitingDeposit={!closedBelowRequired} />
          </>
        ) : cancelled || noShow ? (
          <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">This appointment is no longer on the schedule. Call {businessConfig.phone} with any question, or book a new time.</p>
        ) : awaitingDeposit ? (
          <>
            <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">{holdTime && holdOpen ? `We are holding this time for you until ${holdTime}, ` : "This time is reserved for a short period, "}but <strong className="text-amber-300">your appointment is not confirmed yet</strong>. Pay {paymentAmount} below (plus a 4% service fee) to complete the required service payment.</p>
            {paidPrincipalCents > 0 ? <p className="mt-3 text-sm leading-7 text-[var(--color-bone-muted)]">Your earlier payment of {(paidPrincipalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} toward the service remains fully credited.</p> : null}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm leading-6 text-amber-100">Full service payment is required before a website appointment is confirmed. If payment is not completed within {CHECKOUT_HOLD_MINUTES} minutes the time is released. You will not be charged again for service principal already paid.</p>
            </div>
            {closedBelowRequired ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm leading-6 text-amber-100">Your Square checkout was completed, but it did not collect the full service payment by card (for example, a discount code was applied). A website appointment is confirmed only after the full service payment, so this appointment is not confirmed. Please call {businessConfig.phone} and we will help you.</p>
              </div>
            ) : null}
            <DepositStatusWatcher awaitingDeposit={awaitingDeposit && !closedBelowRequired} />
          </>
        ) : (
          <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">Keep your reference number for your appointment details.</p>
        )}

        <div className="mt-8 rounded-xl border border-[var(--color-ink-line)] p-5">
          <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Booking reference</p>
          <p className="font-display mt-2 text-3xl">{appointment.public_reference}</p>
        </div>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <Detail icon={<Scissors />} label="Service" value={appointment.service_name_snapshot} />
          <Detail icon={<UserRound />} label="Barber" value={appointment.barber_name_snapshot} />
          <Detail icon={<CalendarPlus />} label="Date and time" value={`${date} · ${totalMinutes} minutes`} />
          <Detail icon={<MapPin />} label="Location" value={address} />
        </dl>

        {items.length ? (
          <div className="mt-4 rounded-xl border border-[var(--color-ink-line)] p-5">
            <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Family booking · one appointment, back to back</p>
            <ul className="mt-3 grid gap-2">
              {items.map((item) => (
                <li key={item.sequence} className="flex items-center justify-between gap-4 text-sm">
                  <span>{item.label} · {item.service_name_snapshot}</span>
                  <span className="shrink-0 tabular-nums text-[var(--color-bone-muted)]">{item.duration_snapshot_minutes} min · {(item.price_snapshot_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!closed && !awaitingDeposit && !completed ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={calendarPath} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black"><CalendarPlus className="h-4 w-4" />Download calendar</a>
            <a href={google.toString()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase">Google Calendar</a>
            <a href={businessConfig.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase">Directions</a>
            <a href={businessConfig.phoneHref} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase"><Phone className="h-4 w-4" />Call</a>
          </div>
        ) : null}

        {closed ? null : <SquareDepositButton reference={reference} token={token} amountCents={remainingCents} status={remainingCents <= 0 ? "paid" : appointment.deposit_status} />}
        {closed || completed ? null : <GuestAppointmentActions reference={reference} token={token} startsAt={appointment.starts_at} status={appointment.status} timeZone={appointment.timezone || businessConfig.timezone} />}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/book" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.16em] uppercase text-black">{paidButReleased ? "Book another appointment" : closed ? "Choose a new time" : "Book another appointment"}</Link>
          <Link href="/login?next=/client/appointments" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-ink-line)] px-6 text-[10px] tracking-[.16em] uppercase text-[var(--color-bone)]">Access your client portal</Link>
        </div>
      </section>
    </main>
  );
}

function isStillAhead(value: Date | null) {
  return value ? value.getTime() > Date.now() : false;
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex gap-3 rounded-xl border border-[var(--color-ink-line)] p-4"><span className="mt-1 text-[var(--color-brass)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><div><dt className="text-[9px] tracking-[.18em] uppercase text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-2 text-sm leading-6">{value}</dd></div></div>; }
