import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CircleUserRound,
  Clock3,
  Download,
  Gift,
  MessageCircleQuestion,
  Scissors,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { loadClientPortalData } from "@/lib/portal/client-data";
import { dateTime, money, shortDate, titleCase } from "@/lib/portal/format";
import { barbers, services } from "@/lib/content/site";
import { ClientAppointmentActions } from "./ClientAppointmentActions";
import { ClientMembershipRequest } from "./ClientMembershipRequest";
import { ClientOrderSupport } from "./ClientOrderSupport";
import { ClientProfileForm } from "./ClientProfileForm";
import { ClientQueueActions } from "./ClientQueueActions";
import { ClientSecurityPanel } from "./ClientSecurityPanel";
import styles from "./client-portal.module.css";

const moduleCopy: Record<string, { eyebrow: string; title: string; copy: string; icon: React.ComponentType<{ className?: string }> }> = {
  rebook: { eyebrow: "Appointments", title: "Rebook", copy: "Repeat a previous service and preferred barber without rebuilding the request.", icon: Clock3 },
  rewards: { eyebrow: "Benefits", title: "Rewards", copy: "Only verified qualifying activity and provider-confirmed benefits appear here.", icon: Gift },
  referrals: { eyebrow: "Benefits", title: "Referrals", copy: "Share an approved referral code and track only confirmed activity.", icon: UsersRound },
  notifications: { eyebrow: "Communication", title: "Notifications", copy: "Review recent delivery activity and manage your communication preferences.", icon: Bell },
  support: { eyebrow: "Client care", title: "Support", copy: "Contact the shop about an appointment, queue visit, membership, or order.", icon: MessageCircleQuestion },
  settings: { eyebrow: "Account", title: "Settings", copy: "Manage secure access, language, communication, and privacy choices.", icon: Settings },
  privacy: { eyebrow: "Privacy", title: "Privacy and consent", copy: "Review consent, request an export, or request deletion of your account.", icon: ShieldCheck },
  "grooming-profile": { eyebrow: "Preferences", title: "Grooming profile", copy: "Keep the details that help a barber reproduce your preferred result.", icon: Scissors },
  feedback: { eyebrow: "Service care", title: "Private feedback", copy: "Share feedback directly with management before any optional public review.", icon: MessageCircleQuestion },
};

export async function ClientAppointmentsPage() {
  const data = await loadClientPortalData();
  const now = Date.parse(data.generatedAt);
  const upcoming = data.appointments.filter((item) => item.startsAt && new Date(item.startsAt).getTime() >= now && !["cancelled", "completed", "no_show"].includes(item.status.toLowerCase()));
  const history = data.appointments.filter((item) => !upcoming.some((next) => next.id === item.id));
  return <ClientPageHeader eyebrow="Your visits" title="Appointments" copy="Upcoming and completed appointments tied only to your verified account." action={{ href: "/book", label: "Book" }}>
    <Section title="Upcoming appointments">{upcoming.length ? <div className="grid gap-3">{upcoming.map((item) => <AppointmentCard key={item.id} item={item} />)}</div> : <Empty copy="You do not have an upcoming appointment." href="/book" label="Book a visit" />}</Section>
    <Section title="Appointment history">{history.length ? <div className="grid gap-3">{history.map((item) => <AppointmentCard key={item.id} item={item} />)}</div> : <Empty copy="Completed and cancelled visits will appear here." />}</Section>
  </ClientPageHeader>;
}

export async function ClientAppointmentDetail({ id }: { id: string }) {
  const data = await loadClientPortalData();
  const item = data.appointments.find((entry) => entry.id === id);
  return <ClientPageHeader eyebrow="Appointment" title={item?.service ?? "Appointment not found"} copy={item ? "A secure view of your appointment details." : "This appointment is not available to your account."}>
    {item ? <div className={styles.card}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date and time" value={dateTime(item.startsAt)} />
        <Field label="Barber" value={item.barber} />
        <Field label="Duration" value={item.durationMinutes ? `${item.durationMinutes} minutes` : "To be confirmed"} />
        <Field label="Location" value={item.location} />
        <Field label="Status" value={titleCase(item.status)} />
        <Field label="Deposit" value={titleCase(item.depositStatus)} /><Field label="Price" value={money(item.priceCents)} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="https://maps.google.com/?q=801+Tilton+Road+Suite+106+Northfield+NJ+08225" target="_blank" rel="noreferrer" className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Directions</a>
        <a href="tel:+16093845171" className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Contact shop</a>
        <a href={`/api/client/appointments/${item.id}/calendar`} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Add to calendar</a>
        <Link href="/client/inspiration" className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Inspiration images</Link>
      </div>
      <ClientAppointmentActions appointmentId={item.id} startsAt={item.startsAt} canChange={!['completed','cancelled','no_show'].includes(item.status.toLowerCase())} />
    </div> : <Empty copy="The record may not exist or may belong to another account." href="/client/appointments" label="Back to appointments" />}
  </ClientPageHeader>;
}

export async function ClientQueuePage() {
  const data = await loadClientPortalData();
  return <ClientPageHeader eyebrow="Walk-in visit" title="My queue" copy="Only your own queue status is visible. Other guests and internal assignment rules remain private." action={{ href: "/walk-ins", label: "Queue options" }}>
    {data.queue ? <div className={styles.heroCard}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className={styles.eyebrow}>Current status</p><h2 className="font-display mt-2 text-4xl">{titleCase(data.queue.status)}</h2><p className={`mt-3 text-sm ${styles.muted}`}>{data.queue.service} · Joined {dateTime(data.queue.joinedAt)}</p></div>
        <div className="rounded-2xl bg-black/25 p-5 text-center"><p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-bone-muted)]">Estimated wait</p><p className="font-display mt-2 text-4xl">{data.queue.estimatedWaitMinutes ?? "—"}{data.queue.estimatedWaitMinutes !== null ? " min" : ""}</p></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2"><a href="tel:+16093845171" className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Contact front desk</a><ClientQueueActions entryId={data.queue.id} /></div>
    </div> : <Empty copy="You are not currently in the walk-in queue. Queue check-in appears when the feature is enabled and the shop is accepting guests." href="/walk-ins" label="View walk-in information" />}
  </ClientPageHeader>;
}

export async function ClientOrdersPage() {
  const data = await loadClientPortalData();
  return <ClientPageHeader eyebrow="Receipts" title="Orders" copy="Square-synced orders, deposits, and transaction references belonging to your account.">
    {data.orders.length ? <div className="grid gap-3">{data.orders.map((order) => <article key={order.id} className={styles.card}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className={styles.eyebrow}>Order {order.squareId.slice(-8)}</p><h2 className="font-display mt-2 text-2xl">{money(order.totalCents)}</h2><p className={`mt-2 text-xs ${styles.muted}`}>{shortDate(order.syncedAt)} · {titleCase(order.state)}</p></div>
        <div className="flex flex-wrap gap-2">{order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2.5 text-[9px] tracking-[.14em] uppercase"><Download className="h-4 w-4" />{order.receiptNumber ? `Receipt ${order.receiptNumber}` : "Receipt"}</a> : <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2.5 text-[9px] tracking-[.14em] uppercase opacity-60"><Download className="h-4 w-4" />Receipt pending</span>}<ClientOrderSupport orderId={order.id} /></div>
      </div>
    </article>)}</div> : <Empty copy="No Square-linked orders are available for your account yet." />}
  </ClientPageHeader>;
}

export async function ClientMembershipPage() {
  const data = await loadClientPortalData();
  const membership = data.membership;
  return <ClientPageHeader eyebrow="Continuity" title="Membership" copy="Provider-confirmed membership status, benefits, usage, and change requests.">
    {membership ? <div className={styles.heroCard}>
      <span className={styles.status}>{titleCase(membership.status)}</span>
      <h2 className="font-display mt-4 text-4xl">{membership.planName}</h2>
      <p className={`mt-3 text-sm ${styles.muted}`}>{membership.renewsAt ? `Renewal ${shortDate(membership.renewsAt)}` : "Renewal information is pending provider confirmation."}</p>
      {membership.benefits.length ? <ul className="mt-6 grid gap-2 text-sm text-[var(--color-bone-muted)]">{membership.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}</ul> : null}
      <ClientMembershipRequest membershipId={membership.id} />
      <Link href="/membership-terms" className="mt-4 inline-flex text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Membership terms</Link>
    </div> : <div className="grid gap-4 md:grid-cols-3">{["Precision", "Signature", "Executive"].map((name) => <article key={name} className={styles.card}><p className={styles.eyebrow}>Plan concept</p><h2 className="font-display mt-3 text-2xl">{name}</h2><p className={`mt-3 text-sm leading-6 ${styles.muted}`}>Final pricing and billing activation appear only after owner and provider confirmation.</p><Link href="/membership" className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">View public details <ArrowUpRight className="h-4 w-4" /></Link></article>)}<div className="md:col-span-3"><ClientMembershipRequest /></div></div>}
  </ClientPageHeader>;
}

export async function ClientAccountPage() {
  const data = await loadClientPortalData();
  const membership = data.membership;
  return <ClientPageHeader eyebrow="Account" title="My account" copy="Your essential details, membership, receipts, and support in one place.">
    <div className={styles.accountGrid}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Verified profile</p>
        <h2 className="font-display mt-2 text-2xl">{data.profile.displayName ?? data.profile.fullName ?? "Client account"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={data.profile.email ?? "—"} />
          <Field label="Phone" value={data.profile.phone ?? "Not added"} />
          <Field label="Language" value={data.profile.language === "es" ? "Spanish" : "English"} />
          <Field label="Status" value={titleCase(data.profile.status)} />
        </div>
        <Link href="/client/profile" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-2.5 text-[9px] tracking-[.15em] uppercase text-[var(--color-ink)]">Edit profile <ArrowUpRight className="h-4 w-4" /></Link>
      </section>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Membership</p>
        <h2 className="font-display mt-2 text-2xl">{membership?.planName ?? "No active plan"}</h2>
        <p className={`mt-3 text-sm leading-6 ${styles.muted}`}>{membership?.renewsAt ? `Renews ${shortDate(membership.renewsAt)}` : "View plans, benefits, and provider-confirmed changes."}</p>
        {membership ? <span className={`${styles.status} mt-4`}>{titleCase(membership.status)}</span> : null}
        <Link href="/client/membership" className="mt-6 inline-flex items-center gap-2 text-[10px] tracking-[.15em] uppercase text-[var(--color-brass)]">Membership details <ArrowUpRight className="h-4 w-4" /></Link>
      </section>
    </div>
    <div className={styles.accountLinks}>
      <AccountLink href="/client/orders" title="Receipts" copy="Orders and payment references" />
      <AccountLink href="/client/notifications" title="Notifications" copy="Recent messages and updates" />
      <AccountLink href="/client/privacy" title="Privacy" copy="Consent and data requests" />
      <AccountLink href="/client/support" title="Help" copy="Contact the lounge" />
    </div>
  </ClientPageHeader>;
}

export async function ClientProfilePage() {
  const data = await loadClientPortalData();
  const marketingStatus = data.clientProfile?.marketingStatus;
  const safeMarketing = marketingStatus === "subscribed" || marketingStatus === "unsubscribed" ? marketingStatus : "unknown";
  return <ClientPageHeader eyebrow="Your details" title="Profile" copy="Identity, contact, language, and grooming preferences for your account.">
    <div className="grid gap-4 md:grid-cols-2">
      <section className={styles.card}><h2 className="font-display text-2xl">Verified account</h2><div className="mt-5 grid gap-4"><Field label="Email" value={data.profile.email ?? "—"} /><Field label="Account status" value={titleCase(data.profile.status)} /><Field label="Marketing preference" value={titleCase(safeMarketing)} /></div><p className={`mt-5 text-xs leading-5 ${styles.muted}`}>Email changes require a new secure verification code.</p></section>
      <section className={styles.card}><h2 className="font-display text-2xl">Privacy boundaries</h2><p className={`mt-3 text-sm leading-6 ${styles.muted}`}>Only your records are loaded through your verified Supabase session and Row Level Security. Internal shop notes are not displayed unless marked client-visible.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/client/privacy" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Privacy controls</Link><Link href="/client/settings" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Security settings</Link></div></section>
    </div>
    <ClientProfileForm initial={{ fullName: data.profile.fullName ?? data.profile.displayName ?? "", phone: data.profile.phone ?? "", preferredLanguage: data.profile.language === "es" ? "es" : "en", groomingPreferences: data.clientProfile?.groomingPreferences ?? {}, marketingStatus: safeMarketing }} />
  </ClientPageHeader>;
}

export function ClientBarbersPage() {
  return <ClientPageHeader eyebrow="Meet the team" title="Barbers" copy="Choose a barber by specialties and public profile."><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{barbers.filter((barber) => barber.active).map((barber) => <article key={barber.slug} className={styles.card}><p className={styles.eyebrow}>{barber.title.en}</p><h2 className="font-display mt-3 text-2xl">{barber.name}</h2><p className={`mt-3 text-sm leading-6 ${styles.muted}`}>{barber.bio.en}</p><div className="mt-5 flex gap-3"><Link href={`/barbers/${barber.slug}`} className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Profile</Link><Link href={`/book?barber=${barber.slug}`} className="text-[10px] tracking-[.16em] uppercase">Book</Link></div></article>)}</div></ClientPageHeader>;
}

export function ClientServicesPage() {
  return <ClientPageHeader eyebrow="Grooming menu" title="Services" copy="Public service information with booking actions handed to the configured provider."><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.slice(0, 12).map((service) => <article key={service.slug} className={styles.card}><p className={styles.eyebrow}>{service.category}</p><h2 className="font-display mt-3 text-2xl">{service.name.en}</h2><p className={`mt-3 text-sm leading-6 ${styles.muted}`}>{service.blurb.en}</p><Link href={`/services/${service.slug}`} className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Details <ArrowUpRight className="h-4 w-4" /></Link></article>)}</div></ClientPageHeader>;
}

export async function ClientModulePage({ slug }: { slug: string }) {
  const data = await loadClientPortalData();
  const page = moduleCopy[slug] ?? { eyebrow: "Client portal", title: titleCase(slug), copy: "Secure self-service for your account.", icon: CircleUserRound };
  const Icon = page.icon;
  if (slug === "notifications") return <ClientPageHeader eyebrow={page.eyebrow} title={page.title} copy={page.copy}>{data.notifications.length ? <div className="grid gap-3">{data.notifications.map((item) => <article key={item.id} className={styles.card}><div className="flex items-center justify-between gap-4"><div><strong className="text-sm">{titleCase(item.template) || "Notification"}</strong><p className={`mt-1 text-xs ${styles.muted}`}>{dateTime(item.createdAt)} · {titleCase(item.channel)}</p></div><span className={styles.status}>{titleCase(item.status)}</span></div></article>)}</div> : <Empty copy="No notification history is available." />}</ClientPageHeader>;
  if (slug === "settings") return <ClientPageHeader eyebrow={page.eyebrow} title={page.title} copy={page.copy}><ClientSecurityPanel /><section className={styles.card}><p className={styles.eyebrow}>Preferences</p><h2 className="font-display mt-2 text-2xl">Profile and privacy</h2><div className="mt-5 flex flex-wrap gap-3"><Link href="/client/profile" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Edit profile</Link><Link href="/client/privacy" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Privacy requests</Link><Link href="/client/notifications" className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Notification history</Link></div></section></ClientPageHeader>;
  return <ClientPageHeader eyebrow={page.eyebrow} title={page.title} copy={page.copy}><div className={`${styles.card} grid place-items-center py-12 text-center`}><Icon className="h-8 w-8 text-[var(--color-brass)]" /><h2 className="font-display mt-4 text-2xl">Secure workspace</h2><p className={`mt-3 max-w-xl text-sm leading-6 ${styles.muted}`}>{slug === "rebook" ? "Select a completed appointment from your history or start a new booking with the same service and barber." : slug === "privacy" ? "Export and deletion requests are recorded for review. Consent changes take effect without changing historical records." : "This area uses your verified account only and displays no other client’s information."}</p><div className="mt-6 flex flex-wrap justify-center gap-2">{slug === "rebook" ? <Link href="/client/appointments" className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Choose appointment</Link> : null}{["support", "feedback"].includes(slug) ? <a href="tel:+16093845171" className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Call the lounge</a> : null}<Link href="/client" className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Dashboard</Link></div></div></ClientPageHeader>;
}

function ClientPageHeader({ eyebrow, title, copy, action, children }: { eyebrow: string; title: string; copy: string; action?: { href: string; label: string }; children: React.ReactNode }) {
  return <div className={styles.grid}><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className={styles.eyebrow}>{eyebrow}</p><h1 className="font-display mt-2 text-4xl sm:text-5xl">{title}</h1><p className={`mt-3 max-w-2xl text-sm leading-6 ${styles.muted}`}>{copy}</p></div>{action ? <Link href={action.href} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">{action.label}<ArrowUpRight className="h-4 w-4" /></Link> : null}</header>{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className={`${styles.sectionTitle} mb-3`}>{title}</h2>{children}</section>;
}

function AppointmentCard({ item }: { item: Awaited<ReturnType<typeof loadClientPortalData>>["appointments"][number] }) {
  return <article className={styles.card}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className={styles.eyebrow}>{dateTime(item.startsAt)}</p><h3 className="font-display mt-2 text-2xl">{item.service}</h3><p className={`mt-2 text-xs ${styles.muted}`}>{item.barber} · {item.location}</p></div><div className="flex items-center gap-3"><span className={styles.status}>{titleCase(item.status)}</span><Link href={`/client/appointments/${item.id}`} className="text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">Details</Link></div></div></article>;
}

function Empty({ copy, href, label }: { copy: string; href?: string; label?: string }) {
  return <div className={styles.empty}><p>{copy}</p>{href && label ? <Link href={href} className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[.16em] uppercase text-[var(--color-brass)]">{label}<ArrowUpRight className="h-4 w-4" /></Link> : null}</div>;
}

function AccountLink({ href, title, copy }: { href: string; title: string; copy: string }) {
  return <Link href={href} className={styles.accountLink}><div><strong className="text-sm text-[var(--color-bone)]">{title}</strong><p className={`mt-1 text-[11px] ${styles.muted}`}>{copy}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-brass)]" /></Link>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] tracking-[.15em] uppercase text-[var(--color-bone-muted)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}
