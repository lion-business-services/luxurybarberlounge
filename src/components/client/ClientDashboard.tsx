import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Scissors, UsersRound, WalletCards, ArrowUpRight, ListOrdered, Phone, ReceiptText } from "lucide-react";
import { loadClientPortalData } from "@/lib/portal/client-data";
import { dateTime, money, shortDate, titleCase } from "@/lib/portal/format";
import styles from "./client-portal.module.css";

export async function ClientDashboard() {
  const data = await loadClientPortalData();
  const now = Date.parse(data.generatedAt);
  const next = data.appointments
    .filter((item) => item.startsAt && new Date(item.startsAt).getTime() >= now && !["cancelled", "completed", "no_show"].includes(item.status.toLowerCase()))
    .sort((a,b)=>new Date(a.startsAt ?? 0).getTime()-new Date(b.startsAt ?? 0).getTime())[0] ?? null;
  const recent = data.appointments.find((item) => !next || item.id !== next.id) ?? null;
  const latestOrder = data.orders[0] ?? null;
  const name = data.profile.displayName ?? data.profile.fullName ?? "Welcome back";

  return <div className={styles.grid}>
    <section className={styles.heroCard}>
      <p className={styles.eyebrow}>Client portal</p>
      <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><h1 className="font-display text-4xl leading-tight sm:text-5xl">{name}</h1><p className={`mt-3 max-w-xl text-sm leading-6 ${styles.muted}`}>Your next visit, queue status, membership, and personal grooming history in one calm place.</p></div>
        <Link href="/book" className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]">Book a visit <ArrowUpRight className="h-4 w-4"/></Link>
      </div>
    </section>

    <section className={`${styles.grid} ${styles.gridTwo}`}>
      <article className={styles.card}>
        <div className="flex items-center justify-between gap-3"><div><p className={styles.eyebrow}>Next appointment</p><h2 className={`${styles.sectionTitle} mt-2`}>{next ? next.service : "No appointment scheduled"}</h2></div><CalendarDays className="h-6 w-6 text-[var(--color-brass)]"/></div>
        {next ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail icon={Clock3} label="Date and time" value={dateTime(next.startsAt)} />
          <Detail icon={UsersRound} label="Barber" value={next.barber} />
          <Detail icon={Scissors} label="Duration" value={next.durationMinutes ? `${next.durationMinutes} minutes` : "To be confirmed"} />
          <Detail icon={MapPin} label="Location" value={next.location} />
          <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1"><span className={styles.status}>{titleCase(next.status)}</span>{next.depositStatus ? <span className={styles.status}>Deposit: {titleCase(next.depositStatus)}</span> : null}</div>
          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2"><Link href={`/client/appointments/${next.id}`} className="rounded-full bg-[var(--color-brass)] px-5 py-2.5 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">View appointment</Link><a href="https://maps.google.com/?q=801+Tilton+Road+Suite+106+Northfield+NJ+08225" target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-ink-line)] px-5 py-2.5 text-[9px] tracking-[.16em] uppercase">Directions</a><a href="tel:+16093845171" className="rounded-full border border-[var(--color-ink-line)] px-5 py-2.5 text-[9px] tracking-[.16em] uppercase">Contact</a></div>
        </div> : <div className={`${styles.empty} mt-5`}><p>Choose a service and barber when you are ready.</p><Link href="/book" className="mt-4 inline-flex text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Book now <ArrowUpRight className="ml-2 h-4 w-4"/></Link></div>}
      </article>

      <aside className={styles.card}>
        <div className="flex items-center justify-between"><div><p className={styles.eyebrow}>Queue</p><h2 className={`${styles.sectionTitle} mt-2`}>{data.queue ? titleCase(data.queue.status) : "Not in queue"}</h2></div><ListOrdered className="h-6 w-6 text-[var(--color-brass)]"/></div>
        {data.queue ? <div className="mt-5 space-y-4"><p className={styles.muted}>{data.queue.service}</p><div className="rounded-xl bg-white/[.035] p-4"><p className="text-[10px] tracking-[.16em] uppercase text-[var(--color-bone-muted)]">Estimated wait</p><p className="font-display mt-2 text-3xl">{data.queue.estimatedWaitMinutes ?? "—"}{data.queue.estimatedWaitMinutes !== null ? " min" : ""}</p></div><Link href="/client/queue" className="inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">View my queue status <ArrowUpRight className="h-4 w-4"/></Link></div> : <div className={`${styles.empty} mt-5`}><p>Walk-in queue access appears here when enabled.</p><Link href="/client/queue" className="mt-4 inline-flex text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Queue details</Link></div>}
      </aside>
    </section>

    <section><div className="mb-3 flex items-end justify-between"><div><p className={styles.eyebrow}>Quick actions</p><h2 className={`${styles.sectionTitle} mt-2`}>Your visit, simplified.</h2></div></div><div className={styles.actionGrid}>
      <Quick href="/book" icon={CalendarDays} title="Book" copy="Choose service and barber" />
      <Quick href="/client/rebook" icon={Clock3} title="Rebook" copy="Repeat a previous visit" />
      <Quick href="/client/barbers" icon={UsersRound} title="Barbers" copy="Find your preferred chair" />
      <Quick href="/client/services" icon={Scissors} title="Services" copy="Explore grooming options" />
    </div></section>

    <section className={`${styles.grid} ${styles.gridTwo}`}>
      <article className={styles.card}><div className="flex items-center justify-between"><div><p className={styles.eyebrow}>Membership</p><h2 className={`${styles.sectionTitle} mt-2`}>{data.membership?.planName ?? "No active membership"}</h2></div><WalletCards className="h-6 w-6 text-[var(--color-brass)]"/></div>{data.membership ? <div className="mt-5"><span className={styles.status}>{titleCase(data.membership.status)}</span><p className={`mt-4 text-sm ${styles.muted}`}>{data.membership.renewsAt ? `Renewal ${shortDate(data.membership.renewsAt)}` : "Renewal information is pending provider confirmation."}</p>{data.membership.benefits.length ? <ul className="mt-4 grid gap-2 text-sm text-[var(--color-bone-muted)]">{data.membership.benefits.slice(0,3).map((benefit)=><li key={benefit}>• {benefit}</li>)}</ul> : null}</div> : <p className={`mt-4 text-sm leading-6 ${styles.muted}`}>View plans and request membership changes without implying billing is complete before provider confirmation.</p>}<Link href="/client/membership" className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Manage membership <ArrowUpRight className="h-4 w-4"/></Link></article>
      <article className={styles.card}><div className="flex items-center justify-between"><div><p className={styles.eyebrow}>Recent activity</p><h2 className={`${styles.sectionTitle} mt-2`}>History</h2></div><ReceiptText className="h-6 w-6 text-[var(--color-brass)]"/></div><div className={`${styles.list} mt-4`}>{recent ? <div className={styles.listItem}><div><strong className="text-sm">{recent.service}</strong><p className={`mt-1 text-xs ${styles.muted}`}>{dateTime(recent.startsAt)} · {recent.barber}</p></div><span className={styles.status}>{titleCase(recent.status)}</span></div> : null}{latestOrder ? <div className={styles.listItem}><div><strong className="text-sm">Order {latestOrder.squareId.slice(-6)}</strong><p className={`mt-1 text-xs ${styles.muted}`}>{shortDate(latestOrder.syncedAt)} · {money(latestOrder.totalCents)}</p></div><span className={styles.status}>{titleCase(latestOrder.state)}</span></div> : null}{!recent && !latestOrder ? <div className={styles.empty}>Your completed visits and receipts will appear here.</div> : null}</div><div className="mt-5 flex flex-wrap gap-4"><Link href="/client/appointments" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Appointment history</Link><Link href="/client/orders" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Orders</Link></div></article>
    </section>

    <section className={styles.card}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className={styles.eyebrow}>Need assistance?</p><h2 className={`${styles.sectionTitle} mt-2`}>The lounge is one tap away.</h2><p className={`mt-2 text-sm ${styles.muted}`}>Questions about an appointment, queue status, or order are handled by the shop.</p></div><div className="flex flex-wrap gap-2"><a href="tel:+16093845171" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]"><Phone className="h-4 w-4"/>Call</a><Link href="/client/support" className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Support</Link></div></div></section>
  </div>;
}

function Detail({ icon:Icon, label, value }:{ icon: React.ComponentType<{className?:string}>; label:string; value:string }) { return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]"/><div><p className="text-[9px] tracking-[.15em] uppercase text-[var(--color-bone-muted)]">{label}</p><p className="mt-1 text-sm">{value}</p></div></div>; }
function Quick({href,icon:Icon,title,copy}:{href:string;icon:React.ComponentType<{className?:string}>;title:string;copy:string}) { return <Link href={href} className={styles.action}><Icon className="h-5 w-5 text-[var(--color-brass)]"/><div><strong className="font-display text-lg">{title}</strong><p className={`mt-1 text-xs ${styles.muted}`}>{copy}</p></div></Link>; }
