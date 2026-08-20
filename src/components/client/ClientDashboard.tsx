import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  HelpCircle,
  ListOrdered,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { loadClientPortalData } from "@/lib/portal/client-data";
import { dateTime, shortDate, titleCase } from "@/lib/portal/format";
import styles from "./client-portal.module.css";

export async function ClientDashboard() {
  const data = await loadClientPortalData();
  const now = Date.parse(data.generatedAt);
  const next = data.appointments
    .filter((item) => item.startsAt && new Date(item.startsAt).getTime() >= now && !["cancelled", "completed", "no_show"].includes(item.status.toLowerCase()))
    .sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime())[0] ?? null;
  const name = data.profile.displayName ?? data.profile.fullName ?? "Welcome back";

  return (
    <div className={styles.portalStack}>
      <section className={styles.welcomeCard}>
        <div>
          <p className={styles.eyebrow}>Client portal</p>
          <h1 className="font-display mt-2 text-3xl leading-tight sm:text-4xl">{name}</h1>
          <p className={`mt-2 max-w-xl text-sm leading-6 ${styles.muted}`}>
            Your next visit, queue status, and account details. Nothing else competing for your attention.
          </p>
        </div>
        <Link href="/book" className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.17em] uppercase text-[var(--color-ink)]">
          Book a visit <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>

      <section className={styles.primaryGrid}>
        <article className={styles.appointmentCard}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={styles.eyebrow}>Next visit</p>
              <h2 className="font-display mt-2 text-2xl sm:text-3xl">{next?.service ?? "No appointment yet"}</h2>
            </div>
            <CalendarDays className="h-6 w-6 shrink-0 text-[var(--color-brass)]" />
          </div>

          {next ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <CompactDetail icon={Clock3} label="When" value={dateTime(next.startsAt)} />
                <CompactDetail icon={UsersRound} label="Barber" value={next.barber} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className={styles.status}>{titleCase(next.status)}</span>
                <Link href={`/client/appointments/${next.id}`} className="rounded-full border border-[var(--color-ink-line)] px-4 py-2.5 text-[9px] tracking-[.15em] uppercase">
                  View details
                </Link>
                <Link href="/client/appointments" className="px-2 py-2 text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">
                  All visits
                </Link>
              </div>
              <p className={`mt-4 text-xs leading-5 ${styles.muted}`}>
                Reminders and approved updates are sent automatically to your verified contact details.
              </p>
            </>
          ) : (
            <div className="mt-5">
              <p className={`text-sm leading-6 ${styles.muted}`}>Choose your service and preferred barber whenever you are ready.</p>
              <Link href="/book" className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">
                Book now <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </article>

        <div className={styles.statusStack}>
          <article className={styles.compactCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={styles.eyebrow}>Walk-in queue</p>
                <h2 className="font-display mt-2 text-xl">{data.queue ? titleCase(data.queue.status) : "Not in queue"}</h2>
              </div>
              <ListOrdered className="h-5 w-5 text-[var(--color-brass)]" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className={`text-xs ${styles.muted}`}>
                {data.queue?.estimatedWaitMinutes !== null && data.queue?.estimatedWaitMinutes !== undefined
                  ? `${data.queue.estimatedWaitMinutes} min estimated`
                  : data.queue?.service ?? "Check availability when you arrive."}
              </p>
              <Link href="/client/queue" className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Open</Link>
            </div>
          </article>

          <article className={styles.compactCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={styles.eyebrow}>Membership</p>
                <h2 className="font-display mt-2 text-xl">{data.membership?.planName ?? "No active plan"}</h2>
              </div>
              <WalletCards className="h-5 w-5 text-[var(--color-brass)]" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className={`text-xs ${styles.muted}`}>
                {data.membership?.renewsAt ? `Renews ${shortDate(data.membership.renewsAt)}` : "View plan details in your account."}
              </p>
              <Link href="/client/membership" className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Open</Link>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.quickRow} aria-label="Quick client actions">
        <QuickLink href="/client/appointments" icon={CalendarDays} title="Visits" copy="Appointments and history" />
        <QuickLink href="/client/orders" icon={ReceiptText} title="Receipts" copy="Square-linked orders" />
        <QuickLink href="/client/account" icon={UserRound} title="Account" copy="Profile and preferences" />
      </section>

      <section className={styles.card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brass)]" />
            <div>
              <h2 className="font-display text-xl">Need help?</h2>
              <p className={`mt-1 text-sm ${styles.muted}`}>Call the lounge or open secure account support.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="tel:+16093381876" className="rounded-full bg-[var(--color-brass)] px-5 py-2.5 text-[9px] tracking-[.15em] uppercase text-[var(--color-ink)]">Call</a>
            <Link href="/client/support" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-2.5 text-[9px] tracking-[.15em] uppercase">
              <HelpCircle className="h-4 w-4" /> Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CompactDetail({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-white/[.025] p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" />
      <div>
        <p className="text-[8px] tracking-[.15em] uppercase text-[var(--color-bone-muted)]">{label}</p>
        <p className="mt-1 text-sm">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, copy }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; copy: string }) {
  return (
    <Link href={href} className={styles.quickLink}>
      <Icon className="h-5 w-5 text-[var(--color-brass)]" />
      <div>
        <strong className="font-display text-lg">{title}</strong>
        <p className={`mt-1 text-[11px] ${styles.muted}`}>{copy}</p>
      </div>
    </Link>
  );
}
