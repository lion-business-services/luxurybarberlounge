import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Package,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { loadAdminBarberDetail, loadAdminClientDetail, loadAdminModuleSnapshot, loadAdminPortalData } from "@/lib/portal/admin-data";
import { AdminClientEditor } from "./AdminClientEditor";
import { AdminCreateClient } from "./AdminCreateClient";
import { AdminMembershipManager } from "./AdminMembershipManager";
import { AdminBarberEditor } from "./AdminBarberEditor";
import { AdminBarberInvite } from "./AdminBarberInvite";
import { getServerAuthSession } from "@/lib/auth/server";
import { dateTime, money, shortDate, titleCase } from "@/lib/portal/format";
import styles from "./admin-portal.module.css";

const copy: Record<string, { eyebrow: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  today: { eyebrow: "Daily operations", title: "Today", description: "Arrivals, appointments, walk-ins, barber availability, and anything that needs attention today.", icon: CalendarDays },
  appointments: { eyebrow: "Daily schedule", title: "Appointments", description: "See each visit, client, service, barber, time, and current status in one clear schedule.", icon: CalendarDays },
  services: { eyebrow: "Service menu", title: "Services", description: "Manage the services clients can book, including price, duration, and availability.", icon: Scissors },
  packages: { eyebrow: "Packages", title: "Packages", description: "Review package options, remaining visits, expiration dates, and client usage.", icon: Package },
  "gift-cards": { eyebrow: "Gift cards", title: "Gift cards", description: "Review gift card purchases, balances, usage, and customer assistance.", icon: ShoppingBag },
  attribution: { eyebrow: "Referral credit", title: "Attribution", description: "Review referral and barber credit information used for commission decisions.", icon: FileText },
  commissions: { eyebrow: "Weekly barber pay", title: "Commissions", description: "Review service amounts, tips, adjustments, exceptions, and weekly barber statements.", icon: CircleDollarSign },
  statements: { eyebrow: "Weekly summaries", title: "Statements", description: "Review each barber’s weekly amount, delivery status, questions, and payment status.", icon: FileText },
  disputes: { eyebrow: "Pay questions", title: "Disputes", description: "Review commission questions, supporting details, decisions, and any resulting adjustments.", icon: ShieldCheck },
  automations: { eyebrow: "Automatic messages", title: "Automatic messages", description: "Booking confirmations, reminders, and shop updates are handled automatically in the background.", icon: BellRing },
  campaigns: { eyebrow: "Client outreach", title: "Campaigns", description: "Plan approved client messages, choose audiences, schedule delivery, and review results.", icon: BellRing },
  notifications: { eyebrow: "Client messages", title: "Messages", description: "Review customer and barber communications that are relevant to daily shop operations.", icon: BellRing },
  content: { eyebrow: "Website", title: "Content", description: "Review public website content, images, and publishing status.", icon: FileText },
  reviews: { eyebrow: "Reputation", title: "Reviews", description: "Review client feedback, follow up when needed, and keep responses organized.", icon: FileText },
  analytics: { eyebrow: "Shop performance", title: "Analytics", description: "Review appointments, clients, payments, and other useful business performance totals.", icon: Activity },
  roles: { eyebrow: "Team access", title: "Roles and permissions", description: "Control which parts of the shop portal each team member can use.", icon: UsersRound },
  audit: { eyebrow: "Account activity", title: "Activity history", description: "Review important changes made in the shop portal, including who made them and when.", icon: ShieldCheck },
  security: { eyebrow: "Account access", title: "Security", description: "Review sign-in access and keep shop accounts protected.", icon: ShieldCheck },
  settings: { eyebrow: "Shop setup", title: "Settings", description: "Manage the shop information and day-to-day options used by the team.", icon: ShieldCheck },
};

function adminStatus(value: string) {
  const normalized = String(value ?? "").toLowerCase();
  if (["synced", "processed", "success", "delivered", "sent", "completed", "configured", "healthy", "supabase_primary"].includes(normalized)) return "Active";
  if (["failed", "error", "missing", "unmatched"].includes(normalized)) return "Needs attention";
  return titleCase(value);
}

export async function AdminClientsPage() {
  const data = await loadAdminPortalData();
  return <AdminPageHeader eyebrow="Client management" title="Clients" copy="Find a client, review visit history, update approved details, and handle follow-up.">
    <AdminCreateClient />
    {data.clients.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Client</th><th>Email</th><th>Phone</th><th>Language</th><th>Marketing</th><th>Created</th><th /></tr></thead><tbody>{data.clients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong></td><td>{client.email ?? "—"}</td><td>{client.phone ?? "—"}</td><td>{client.language.toUpperCase()}</td><td>{titleCase(client.marketing)}</td><td>{shortDate(client.createdAt)}</td><td><Link href={`/admin/clients/${client.id}`} className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Open</Link></td></tr>)}</tbody></table></div> : <Empty text="No client records have been created yet." />}
  </AdminPageHeader>;
}

export async function AdminClientDetail({ id }: { id: string }) {
  const client = await loadAdminClientDetail(id);
  return <AdminPageHeader eyebrow="Client management" title={client?.name ?? "Client record"} copy={client ? "Review this client’s contact details, visits, membership, and notes." : "This client record is not available.">
    {client ? <div className="grid gap-4">
      <section className={styles.metricGrid}>{Object.entries(client.totals).map(([label,value]) => <article key={label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{titleCase(label)}</p><p className={styles.metricValue}>{value}</p></article>)}</section>
      <div className="grid gap-4 xl:grid-cols-3"><section className={styles.card}><h2 className="font-display text-2xl">Profile</h2><div className="mt-5 grid gap-4"><Field label="Email" value={client.email ?? "Not provided"} /><Field label="Phone" value={client.phone ?? "Not provided"} /><Field label="Language" value={client.language.toUpperCase()} /><Field label="Account status" value={titleCase(client.status)} /><Field label="Marketing" value={titleCase(client.marketing)} /></div>{client.tags.length ? <div className="mt-5 flex flex-wrap gap-2">{client.tags.map((tag) => <span key={tag} className="rounded-full bg-white/[.05] px-3 py-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{tag}</span>)}</div> : null}</section>
      <section className={`${styles.card} xl:col-span-2`}><h2 className="font-display text-2xl">Visit history</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">Review this client’s appointments, purchases, membership, notes, feedback, and support history.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><ModuleLink href={`/admin/appointments?client=${client.id}`} title="Appointments" /><ModuleLink href={`/admin/orders?client=${client.id}`} title="Orders" /><ModuleLink href={`/admin/memberships?client=${client.id}`} title="Membership" /></div>{client.notes.length ? <div className="mt-6 grid gap-2">{client.notes.slice(0,8).map((note) => <article key={note.id} className="rounded-lg border border-white/[.06] p-3"><div className="flex items-center justify-between gap-3"><span className="text-[8px] uppercase tracking-[.14em] text-[var(--color-brass)]">{note.visibility === "internal" ? "Shop note" : titleCase(note.visibility)}</span><span className="text-[9px] text-[var(--color-bone-muted)]">{dateTime(note.createdAt)}</span></div><p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">{note.note}</p></article>)}</div> : <p className="mt-5 text-xs text-[var(--color-bone-muted)]">No client notes yet.</p>}</section></div>
      <AdminClientEditor client={client} />
    </div> : <Empty text="Client not found." />}
  </AdminPageHeader>;
}

export async function AdminOrdersPage() {
  const data = await loadAdminPortalData();
  return <AdminPageHeader eyebrow="Payments" title="Orders" copy="Review customer orders and payment totals. Payment changes are handled through the payment provider.">
    {data.orders.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Order reference</th><th>Status</th><th>Total</th><th>Updated</th><th /></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td>{order.squareId}</td><td>{adminStatus(order.state)}</td><td>{money(order.totalCents)}</td><td>{dateTime(order.syncedAt)}</td><td><span className="text-[9px] text-[var(--color-bone-muted)]">View payment details</span></td></tr>)}</tbody></table></div> : <Empty text="No orders to show yet." />}
  </AdminPageHeader>;
}

export async function AdminMembershipsPage() {
  const [data, session] = await Promise.all([loadAdminPortalData(), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Membership operations" title="Memberships" copy="Manage approved plans, active members, usage, renewal dates, and membership requests in one place.">
    <AdminMembershipManager plans={data.membershipPlans} requests={data.membershipRequests} owner={owner} />
    {data.memberships.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Client</th><th>Plan</th><th>Status</th><th>Renews</th></tr></thead><tbody>{data.memberships.map((item) => <tr key={item.id}><td><Link href={`/admin/clients/${item.clientId}`} className="text-[var(--color-brass)]">{item.clientName}</Link></td><td>{item.plan}</td><td>{adminStatus(item.status)}</td><td>{item.renewsAt ? shortDate(item.renewsAt) : "—"}</td></tr>)}</tbody></table></div> : <Empty text="No client memberships yet. Approved plans and active members will appear here automatically." />}
  </AdminPageHeader>;
}

export async function AdminBarbersPage() {
  const [data, session] = await Promise.all([loadAdminPortalData(), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Barber operations" title="Barbers" copy="Manage profiles, walk-in availability, services, and online booking from one simple workspace.">
    {owner ? <AdminBarberInvite /> : null}
    {data.barbers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.barbers.map((barber) => <article key={barber.id} className={styles.card}><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-brass)]">{barber.title}</p><h2 className="font-display mt-2 text-2xl">{barber.name}</h2></div><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-brass)]">{barber.active ? adminStatus(barber.status) : "Inactive"}</span></div><div className="mt-5 flex gap-4"><Link href={`/admin/barbers/${barber.id}`} className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Manage</Link><Link href={`/barbers/${barber.slug}`} className="text-[9px] tracking-[.14em] uppercase">Public profile</Link></div></article>)}</div> : <Empty text="No barber accounts are linked yet. Invite each barber with their real email address to begin." />}
  </AdminPageHeader>;
}

export async function AdminBarberDetail({ id }: { id: string }) {
  const [barber, session] = await Promise.all([loadAdminBarberDetail(id), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Barber operations" title={barber?.name ?? "Barber record"} copy="Keep this barber’s profile, availability, eligible services, appointments, and calculated pay accurate from one place.">
    {barber ? <div className="grid gap-4"><section className={styles.metricGrid}>{Object.entries(barber.totals).map(([label,value]) => <article key={label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{titleCase(label)}</p><p className={styles.metricValue}>{value}</p></article>)}</section><div className="grid gap-4 lg:grid-cols-3"><section className={styles.card}><Field label="Title" value={barber.title} /><div className="mt-4"><Field label="Profile status" value={adminStatus(barber.status)} /></div><div className="mt-4"><Field label="Active" value={barber.active ? "Yes" : "No"} /></div><div className="mt-4"><Field label="Online booking" value={barber.squareTeamMemberId ? "Ready" : "Needs setup"} /></div><div className="mt-4"><Field label="Languages" value={barber.languages.join(", ") || "Not recorded"} /></div></section><section className={`${styles.card} lg:col-span-2`}><h2 className="font-display text-2xl">Barber details</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{barber.intro || barber.biography || "No biography has been added yet."}</p>{barber.specialties.length ? <div className="mt-4 flex flex-wrap gap-2">{barber.specialties.map((item) => <span key={item} className="rounded-full bg-white/[.05] px-3 py-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{item}</span>)}</div> : null}<div className="mt-5 grid gap-3 sm:grid-cols-3"><ModuleLink href={`/admin/appointments?barber=${barber.staffUserId ?? barber.id}`} title="Appointments" /><ModuleLink href="/admin/services" title="Service menu" /><ModuleLink href="/admin/commissions" title="Calculated pay" /></div></section></div><AdminBarberEditor barber={barber} owner={owner} /></div> : <Empty text="Barber not found." />}
  </AdminPageHeader>;
}

export async function AdminAutomationsPage() {
  return <AdminPageHeader eyebrow="Automatic messages" title="Automatic messages" copy="The shop’s routine booking communications run automatically so the team can focus on clients.">
    <div className="grid gap-4 md:grid-cols-3">
      <SimpleStatusCard title="Booking confirmations" status="Automatic" copy="Clients receive their booking confirmation after payment is completed." />
      <SimpleStatusCard title="Appointment reminders" status="Automatic" copy="Scheduled reminders are handled without daily staff setup." />
      <SimpleStatusCard title="Shop & barber updates" status="Automatic" copy="Relevant appointment updates are sent to the shop and assigned barber." />
    </div>
  </AdminPageHeader>;
}

export async function AdminIntegrationsPage({ provider }: { provider?: string }) {
  const services = [
    {
      keys: ["supabase", "booking", "online-booking"],
      label: "Online booking",
      connected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: "Appointments, clients, schedules, and shop records are available to the portal.",
    },
    {
      keys: ["resend", "email", "messages"],
      label: "Email",
      connected: Boolean(process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY),
      detail: "Booking confirmations and appointment messages can be sent automatically.",
    },
    {
      keys: ["square", "payments", "payment"],
      label: "Payments",
      connected: Boolean(process.env.SQUARE_ACCESS_TOKEN),
      detail: "Card payments and receipts are available to the shop.",
    },
  ];
  const normalizedProvider = provider?.toLowerCase();
  const filtered = normalizedProvider ? services.filter((item) => item.keys.includes(normalizedProvider)) : services;
  const visible = filtered.length ? filtered : services;
  const heading = visible.length === 1 ? visible[0].label : "Connected services";
  return <AdminPageHeader eyebrow="Shop services" title={heading} copy="These services support daily shop operations automatically. No technical setup is shown here.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((service) => <SimpleStatusCard key={service.label} title={service.label} status={service.connected ? "Connected" : "Needs attention"} copy={service.connected ? service.detail : "This service needs attention before it can be used normally."} />)}</div>
  </AdminPageHeader>;
}

export function AdminSettingsHub() {
  return <AdminPageHeader eyebrow="Shop setup" title="Settings" copy="Open only the area you need to manage the shop.">
    <div className="grid gap-4 md:grid-cols-3">
      <section className={styles.card}>
        <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Shop</p>
        <h2 className="font-display mt-2 text-2xl">Services & sales</h2>
        <div className="mt-5 grid gap-2">
          <ModuleLink href="/admin/services" title="Services" />
          <ModuleLink href="/admin/memberships" title="Memberships" />
          <ModuleLink href="/admin/orders" title="Orders" />
        </div>
      </section>
      <section className={styles.card}>
        <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Team</p>
        <h2 className="font-display mt-2 text-2xl">Access</h2>
        <div className="mt-5 grid gap-2">
          <ModuleLink href="/admin/users" title="Users & invitations" />
          <ModuleLink href="/admin/roles" title="Roles & permissions" />
          <ModuleLink href="/admin/security" title="Account security" />
        </div>
      </section>
      <section className={styles.card}>
        <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Operations</p>
        <h2 className="font-display mt-2 text-2xl">Daily setup</h2>
        <div className="mt-5 grid gap-2">
          <ModuleLink href="/admin/time-off" title="Availability" />
          <ModuleLink href="/admin/payments" title="Payment tracking" />
          <ModuleLink href="/admin/commissions" title="Commissions" />
        </div>
      </section>
    </div>
  </AdminPageHeader>;
}

export async function AdminModulePage({ slug }: { slug: string }) {
  const [data, snapshot] = await Promise.all([loadAdminPortalData(), loadAdminModuleSnapshot(slug)]);
  const page = copy[slug] ?? { eyebrow: "Shop operations", title: titleCase(slug), description: "Review and manage the current shop records for this area.", icon: Activity };
  const Icon = page.icon;
  const analytics = slug === "analytics" ? data.metrics : [];
  return <AdminPageHeader eyebrow={page.eyebrow} title={page.title} copy={page.description}>
    {analytics.length ? <section className={styles.metricGrid}>{analytics.map((metric) => <article key={metric.label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{metric.label}</p><p className={styles.metricValue}>{metric.value}</p><p className="mt-2 text-[10px] leading-4 text-[var(--color-bone-muted)]">{metric.note}</p></article>)}</section> : null}
    {snapshot.totals.length ? <section className={styles.metricGrid}>{snapshot.totals.map((item) => <article key={item.label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{item.label}</p><p className={styles.metricValue}>{item.value}</p></article>)}</section> : null}
    {snapshot.records.length ? <section className={styles.card}><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Current records</h2></div><div className={`${styles.tableWrap} mt-5`}><table className={styles.table}><thead><tr><th>Record</th><th>Details</th><th>Status</th></tr></thead><tbody>{snapshot.records.map((item) => <tr key={item.id}><td><strong>{item.primary}</strong></td><td>{item.secondary || "—"}</td><td>{adminStatus(item.status)}</td></tr>)}</tbody></table></div></section> : <section className={styles.card}><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Nothing here yet</h2></div><p className="mt-4 text-sm leading-6 text-[var(--color-bone-muted)]">{data.configured ? "New shop activity will appear here automatically." : "Shop information could not be loaded. Please refresh, or sign out and sign back in if needed."}</p></section>}
  </AdminPageHeader>;
}

function AdminPageHeader({ eyebrow, title, copy: description, action, children }: { eyebrow: string; title: string; copy: string; action?: { href: string; label: string }; children: React.ReactNode }) {
  return <div className={styles.grid}><header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">{eyebrow}</p><h1 className="font-display mt-3 text-4xl sm:text-5xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">{description}</p></div>{action ? <Link href={action.href} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">{action.label}<ArrowUpRight className="h-4 w-4" /></Link> : null}</header>{children}</div>;
}
function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }
function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-bone-muted)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>; }
function ModuleLink({ href, title }: { href: string; title: string }) { return <Link href={href} className="flex items-center justify-between rounded-lg border border-white/[.06] p-3 text-xs text-[var(--color-bone-muted)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-bone)]"><span>{title}</span><ArrowUpRight className="h-4 w-4 text-[var(--color-brass)]" /></Link>; }
function SimpleStatusCard({ title, status, copy }: { title: string; status: string; copy: string }) { return <article className={styles.card}><div className="flex items-start justify-between gap-3"><h2 className="font-display text-2xl">{title}</h2><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-brass)]">{status}</span></div><p className="mt-4 text-sm leading-6 text-[var(--color-bone-muted)]">{copy}</p></article>; }
