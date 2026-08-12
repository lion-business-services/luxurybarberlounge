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
  WandSparkles,
} from "lucide-react";
import { loadAdminAutomationRules, loadAdminBarberDetail, loadAdminClientDetail, loadAdminModuleSnapshot, loadAdminPortalData } from "@/lib/portal/admin-data";
import { AdminClientEditor } from "./AdminClientEditor";
import { AdminCreateClient } from "./AdminCreateClient";
import { AdminMembershipPlanForm } from "./AdminMembershipPlanForm";
import { AdminMembershipManager } from "./AdminMembershipManager";
import { AdminBarberEditor } from "./AdminBarberEditor";
import { AdminBarberInvite } from "./AdminBarberInvite";
import { AdminAutomationManager } from "./AdminAutomationManager";
import { getServerAuthSession } from "@/lib/auth/server";
import { dateTime, money, shortDate, titleCase } from "@/lib/portal/format";
import styles from "./admin-portal.module.css";

const copy: Record<string, { eyebrow: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  today: { eyebrow: "Daily operations", title: "Today", description: "Arrivals, queue, barber capacity, and exceptions requiring attention.", icon: CalendarDays },
  appointments: { eyebrow: "Daily schedule", title: "Appointments", description: "See each visit, client, service, barber, time, and current status in one clear schedule.", icon: CalendarDays },
  services: { eyebrow: "Service menu", title: "Services", description: "Manage the services clients can book, including price, duration, deposit, and availability.", icon: Scissors },
  packages: { eyebrow: "Commerce", title: "Packages", description: "Package terms, usage rules, provider state, and historical integrity.", icon: Package },
  "gift-cards": { eyebrow: "Commerce", title: "Gift cards", description: "Provider-backed gift card activity without rewriting financial source records.", icon: ShoppingBag },
  attribution: { eyebrow: "Commission governance", title: "Attribution", description: "SHOP and BARBER attribution, evidence, claims, decisions, and rule versions.", icon: FileText },
  commissions: { eyebrow: "Weekly barber pay", title: "Commissions", description: "Review verified service amounts, tips, adjustments, exceptions, and weekly barber statements.", icon: CircleDollarSign },
  statements: { eyebrow: "Weekly summaries", title: "Statements", description: "Review each barber’s weekly amount, delivery status, questions, and manual payment status.", icon: FileText },
  disputes: { eyebrow: "Formal review", title: "Disputes", description: "Evidence, deadlines, review history, decisions, and resulting Adjustments.", icon: ShieldCheck },
  automations: { eyebrow: "Workflow engine", title: "Automations", description: "Triggers, conditions, schedules, consent, quiet hours, retries, and delivery logs.", icon: WandSparkles },
  campaigns: { eyebrow: "Growth", title: "Campaigns", description: "Consent-aware audiences, approved templates, scheduling, and delivery performance.", icon: BellRing },
  notifications: { eyebrow: "Delivery operations", title: "Notifications", description: "Queued, delivered, suppressed, and failed email or SMS jobs.", icon: BellRing },
  content: { eyebrow: "Publishing", title: "Content", description: "Public content states, media, policies, search metadata, and approval controls.", icon: FileText },
  reviews: { eyebrow: "Reputation", title: "Reviews", description: "Verified feedback, moderation, escalation, and response workflows.", icon: FileText },
  analytics: { eyebrow: "Business intelligence", title: "Analytics", description: "Clearly labeled Square-derived, Supabase-derived, calculated, and estimated metrics.", icon: Activity },
  roles: { eyebrow: "Access control", title: "Roles and permissions", description: "Server-controlled roles, permission sets, business scope, and invitation policy.", icon: UsersRound },
  audit: { eyebrow: "Governance", title: "Audit log", description: "Sensitive actions with actor, entity, reason, timestamp, and correlation context.", icon: ShieldCheck },
  security: { eyebrow: "Security", title: "Security center", description: "Sessions, OTP protection, access failures, policies, storage, and environment health.", icon: ShieldCheck },
  settings: { eyebrow: "Business configuration", title: "Settings", description: "Business information, location, policies, features, notifications, and data controls.", icon: ShieldCheck },
};

export async function AdminClientsPage() {
  const data = await loadAdminPortalData();
  return <AdminPageHeader eyebrow="Client management" title="Clients" copy="Find a client, review visit history, update approved details, and handle follow-up.">
    <AdminCreateClient />
    {data.clients.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Client</th><th>Email</th><th>Phone</th><th>Language</th><th>Marketing</th><th>Created</th><th /></tr></thead><tbody>{data.clients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong></td><td>{client.email ?? "—"}</td><td>{client.phone ?? "—"}</td><td>{client.language.toUpperCase()}</td><td>{titleCase(client.marketing)}</td><td>{shortDate(client.createdAt)}</td><td><Link href={`/admin/clients/${client.id}`} className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Open</Link></td></tr>)}</tbody></table></div> : <Empty text="No client records have been created yet." />}
  </AdminPageHeader>;
}

export async function AdminClientDetail({ id }: { id: string }) {
  const client = await loadAdminClientDetail(id);
  return <AdminPageHeader eyebrow="Client management" title={client?.name ?? "Client record"} copy={client ? "Authorized operational view of this client’s account." : "The client record is unavailable or outside your authorized business scope."}>
    {client ? <div className="grid gap-4">
      <section className={styles.metricGrid}>{Object.entries(client.totals).map(([label,value]) => <article key={label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{titleCase(label)}</p><p className={styles.metricValue}>{value}</p></article>)}</section>
      <div className="grid gap-4 xl:grid-cols-3"><section className={styles.card}><h2 className="font-display text-2xl">Profile</h2><div className="mt-5 grid gap-4"><Field label="Email" value={client.email ?? "Not provided"} /><Field label="Phone" value={client.phone ?? "Not provided"} /><Field label="Language" value={client.language.toUpperCase()} /><Field label="Account status" value={titleCase(client.status)} /><Field label="Marketing" value={titleCase(client.marketing)} /></div>{client.tags.length ? <div className="mt-5 flex flex-wrap gap-2">{client.tags.map((tag) => <span key={tag} className="rounded-full bg-white/[.05] px-3 py-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{tag}</span>)}</div> : null}</section>
      <section className={`${styles.card} xl:col-span-2`}><h2 className="font-display text-2xl">Operational history</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">Appointments, queue visits, orders, memberships, consent, feedback, and support are loaded from authorized records only.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><ModuleLink href={`/admin/appointments?client=${client.id}`} title="Appointments" /><ModuleLink href={`/admin/orders?client=${client.id}`} title="Orders" /><ModuleLink href={`/admin/memberships?client=${client.id}`} title="Membership" /></div>{client.notes.length ? <div className="mt-6 grid gap-2">{client.notes.slice(0,8).map((note) => <article key={note.id} className="rounded-lg border border-white/[.06] p-3"><div className="flex items-center justify-between gap-3"><span className="text-[8px] uppercase tracking-[.14em] text-[var(--color-brass)]">{note.visibility}</span><span className="text-[9px] text-[var(--color-bone-muted)]">{dateTime(note.createdAt)}</span></div><p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">{note.note}</p></article>)}</div> : <p className="mt-5 text-xs text-[var(--color-bone-muted)]">No client notes yet.</p>}</section></div>
      <AdminClientEditor client={client} />
    </div> : <Empty text="Client not found." />}
  </AdminPageHeader>;
}

export async function AdminOrdersPage() {
  const data = await loadAdminPortalData();
  return <AdminPageHeader eyebrow="Order oversight" title="Orders" copy="Square remains the financial source of truth. Review synchronized orders and handle client support without editing payment records here.">
    {data.orders.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Square order</th><th>State</th><th>Total</th><th>Last synchronized</th><th>Controls</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td>{order.squareId}</td><td>{titleCase(order.state)}</td><td>{money(order.totalCents)}</td><td>{dateTime(order.syncedAt)}</td><td><span className="text-[9px] text-[var(--color-bone-muted)]">Financial edits remain in Square</span></td></tr>)}</tbody></table></div> : <Empty text="No Square orders have been synchronized." />}
  </AdminPageHeader>;
}

export async function AdminMembershipsPage() {
  const [data, session] = await Promise.all([loadAdminPortalData(), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Membership operations" title="Memberships" copy="Manage approved plans, active members, usage, renewal dates, and membership requests in one place.">
    {owner ? <AdminMembershipPlanForm /> : <div className={styles.empty}>Managers may review membership activity. Only the owner can create or publish plan terms.</div>}
    <AdminMembershipManager plans={data.membershipPlans} requests={data.membershipRequests} owner={owner} />
    {data.memberships.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Client</th><th>Plan</th><th>Status</th><th>Renews</th></tr></thead><tbody>{data.memberships.map((item) => <tr key={item.id}><td><Link href={`/admin/clients/${item.clientId}`} className="text-[var(--color-brass)]">{item.clientName}</Link></td><td>{item.plan}</td><td>{titleCase(item.status)}</td><td>{item.renewsAt ? shortDate(item.renewsAt) : "—"}</td></tr>)}</tbody></table></div> : <Empty text="No client memberships yet. Approved plans and active members will appear here automatically." />}
  </AdminPageHeader>;
}

export async function AdminBarbersPage() {
  const [data, session] = await Promise.all([loadAdminPortalData(), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Barber operations" title="Barbers" copy="Manage profiles, walk-in availability, services, and provider mapping from one simple workspace.">
    {owner ? <AdminBarberInvite /> : null}
    {data.barbers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.barbers.map((barber) => <article key={barber.id} className={styles.card}><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-brass)]">{barber.title}</p><h2 className="font-display mt-2 text-2xl">{barber.name}</h2></div><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-brass)]">{barber.active ? titleCase(barber.status) : "Inactive"}</span></div><div className="mt-5 flex gap-4"><Link href={`/admin/barbers/${barber.id}`} className="text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)]">Manage</Link><Link href={`/barbers/${barber.slug}`} className="text-[9px] tracking-[.14em] uppercase">Public profile</Link></div></article>)}</div> : <Empty text="No barber accounts are linked yet. Invite each barber with their real email address to begin." />}
  </AdminPageHeader>;
}

export async function AdminBarberDetail({ id }: { id: string }) {
  const [barber, session] = await Promise.all([loadAdminBarberDetail(id), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Barber operations" title={barber?.name ?? "Barber record"} copy="Keep this barber’s profile, availability, eligible services, appointments, and calculated pay accurate from one place.">
    {barber ? <div className="grid gap-4"><section className={styles.metricGrid}>{Object.entries(barber.totals).map(([label,value]) => <article key={label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{titleCase(label)}</p><p className={styles.metricValue}>{value}</p></article>)}</section><div className="grid gap-4 lg:grid-cols-3"><section className={styles.card}><Field label="Title" value={barber.title} /><div className="mt-4"><Field label="Profile state" value={titleCase(barber.status)} /></div><div className="mt-4"><Field label="Active" value={barber.active ? "Yes" : "No"} /></div><div className="mt-4"><Field label="Booking connection" value={barber.squareTeamMemberId ? "Connected" : "Not connected"} /></div><div className="mt-4"><Field label="Languages" value={barber.languages.join(", ") || "Not recorded"} /></div></section><section className={`${styles.card} lg:col-span-2`}><h2 className="font-display text-2xl">Operating controls</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{barber.intro || barber.biography || "No verified biography is stored yet."}</p>{barber.specialties.length ? <div className="mt-4 flex flex-wrap gap-2">{barber.specialties.map((item) => <span key={item} className="rounded-full bg-white/[.05] px-3 py-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{item}</span>)}</div> : null}<div className="mt-5 grid gap-3 sm:grid-cols-3"><ModuleLink href={`/admin/appointments?barber=${barber.staffUserId ?? barber.id}`} title="Appointments" /><ModuleLink href="/admin/services" title="Service menu" /><ModuleLink href="/admin/commissions" title="Calculated pay" /></div></section></div><AdminBarberEditor barber={barber} owner={owner} /></div> : <Empty text="Barber not found." />}
  </AdminPageHeader>;
}


export async function AdminAutomationsPage() {
  const [rules, session] = await Promise.all([loadAdminAutomationRules(), getServerAuthSession()]);
  const owner = session.roles.some((role) => role === "owner" || role === "super_admin");
  return <AdminPageHeader eyebrow="Workflow engine" title="Automations" copy="Create rules in test mode, review consent and quiet-hour boundaries, and activate only when the required provider is configured.">
    <AdminAutomationManager rules={rules} owner={owner} />
  </AdminPageHeader>;
}

export async function AdminIntegrationsPage({ provider }: { provider?: string }) {
  const data = await loadAdminPortalData();
  const envChecks = [
    { provider: "Supabase", status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configured" : "Missing browser credentials", detail: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Admin server credential configured" : "Admin server credential missing" },
    { provider: "Resend", status: process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY ? "Configured" : "Missing API key", detail: process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Sender not configured" },
    { provider: "Square", status: process.env.SQUARE_ACCESS_TOKEN ? "Configured" : "Awaiting credentials", detail: process.env.SQUARE_ENVIRONMENT ?? "sandbox" },
  ];
  const systems = data.systems.length ? data.systems : envChecks.map((item) => ({ provider: item.provider, status: item.status, detail: item.detail }));
  const filtered = provider ? systems.filter((item) => item.provider.toLowerCase() === provider.toLowerCase()) : systems;
  return <AdminPageHeader eyebrow="System health" title={provider ? `${titleCase(provider)} integration` : "Integrations"} copy="Credentials remain server-only. This area exposes configuration state, synchronization health, failures, and safe recovery controls.">
    {filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((system) => <article key={system.provider} className={styles.card}><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl">{titleCase(system.provider)}</h2><span className="rounded-full bg-white/[.04] px-2 py-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-brass)]">{titleCase(system.status)}</span></div><p className="mt-4 text-sm leading-6 text-[var(--color-bone-muted)]">{system.detail}</p><p className="mt-5 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Secrets are never displayed</p></article>)}</div> : <Empty text="No integration state is available." />}
  </AdminPageHeader>;
}

export function AdminSettingsHub() {
  return <AdminPageHeader eyebrow="Shop setup" title="Settings" copy="Advanced setup stays out of daily operations. Open only the area you need.">
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
        <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Access</p>
        <h2 className="font-display mt-2 text-2xl">Team permissions</h2>
        <div className="mt-5 grid gap-2">
          <ModuleLink href="/admin/users" title="Users & invitations" />
          <ModuleLink href="/admin/roles" title="Roles & permissions" />
          <ModuleLink href="/admin/security" title="Security" />
        </div>
      </section>
      <section className={styles.card}>
        <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Systems</p>
        <h2 className="font-display mt-2 text-2xl">Connections</h2>
        <div className="mt-5 grid gap-2">
          <ModuleLink href="/admin/integrations" title="Integrations" />
          <ModuleLink href="/admin/webhooks" title="Webhook activity" />
          <ModuleLink href="/admin/audit" title="Audit log" />
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
    {analytics.length ? <section className={styles.metricGrid}>{analytics.map((metric) => <article key={metric.label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{metric.label}</p><p className={styles.metricValue}>{metric.value}</p><span className={styles.source}>{metric.source}</span><p className="mt-2 text-[10px] leading-4 text-[var(--color-bone-muted)]">{metric.note}</p></article>)}</section> : null}
    {snapshot.totals.length ? <section className={styles.metricGrid}>{snapshot.totals.map((item) => <article key={item.label} className={styles.metric}><p className="text-[8px] tracking-[.17em] uppercase text-[var(--color-bone-muted)]">{item.label}</p><p className={styles.metricValue}>{item.value}</p><span className={styles.source}>{item.source}</span></article>)}</section> : null}
    {snapshot.records.length ? <section className={styles.card}><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Current records</h2></div><div className={`${styles.tableWrap} mt-5`}><table className={styles.table}><thead><tr><th>Record</th><th>Details</th><th>Status</th><th>Notes</th></tr></thead><tbody>{snapshot.records.map((item) => <tr key={item.id}><td><strong>{item.primary}</strong></td><td>{item.secondary || "—"}</td><td>{titleCase(item.status)}</td><td>{item.meta || "—"}</td></tr>)}</tbody></table></div></section> : <section className={styles.card}><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Nothing here yet</h2></div><p className="mt-4 text-sm leading-6 text-[var(--color-bone-muted)]">{data.configured ? "New confirmed shop activity will appear here automatically." : "Your secure session could not load shop records. Sign out and sign back in once, then reload this page."}</p></section>}
  </AdminPageHeader>;
}

function AdminPageHeader({ eyebrow, title, copy: description, action, children }: { eyebrow: string; title: string; copy: string; action?: { href: string; label: string }; children: React.ReactNode }) {
  return <div className={styles.grid}><header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">{eyebrow}</p><h1 className="font-display mt-3 text-4xl sm:text-5xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">{description}</p></div>{action ? <Link href={action.href} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">{action.label}<ArrowUpRight className="h-4 w-4" /></Link> : null}</header>{children}</div>;
}
function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }
function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-bone-muted)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>; }
function ModuleLink({ href, title }: { href: string; title: string }) { return <Link href={href} className="flex items-center justify-between rounded-lg border border-white/[.06] p-3 text-xs text-[var(--color-bone-muted)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-bone)]"><span>{title}</span><ArrowUpRight className="h-4 w-4 text-[var(--color-brass)]" /></Link>; }
