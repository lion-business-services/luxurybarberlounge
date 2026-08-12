import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CircleDollarSign, Clock3, ExternalLink, Scissors, UsersRound } from "lucide-react";
import { loadBarberPortalData, type BarberPortalData } from "@/lib/portal/barber-data";
import { money, titleCase } from "@/lib/portal/format";
import { ActionCard, EmptyState, MetricGrid, PortalHeader, PortalTable } from "@/components/portal/PortalUI";
import { PortalShell } from "@/components/portal/PortalShell";

const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tz = "America/New_York";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
function time(value: string) {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hour || 0, minute || 0));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(date);
}
function activeAppointments(data: BarberPortalData) {
  return data.appointments.filter((item) => !["cancelled_by_client", "cancelled_by_business", "declined", "expired", "failed"].includes(item.status));
}

export async function BarberDashboardLive() {
  const data = await loadBarberPortalData();
  const now = new Date(data.generatedAt).getTime();
  const next = activeAppointments(data).filter((item) => new Date(item.endsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 8);
  const metrics = [
    { label: "Appointments", value: String(data.performance.appointmentCount), note: "Your assigned appointment records" },
    { label: "Clients", value: String(data.performance.uniqueClients), note: "Clients assigned to your appointment history" },
    { label: "Current statement", value: money(data.commission.currentAmountCents), note: data.commission.latestPeriod ?? "No weekly statement yet" },
    { label: "Queue now", value: String(data.queue.length), note: "Active walk-ins assigned to you" },
  ];
  return <PortalShell role="barber"><PortalHeader eyebrow="Barber workspace" title={`${data.barber.name}, at a glance.`} copy="Your schedule, appointments, clients, queue, and calculated amounts are scoped to your verified barber account." actions={<Link href="/barber/today" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" />Open today</Link>} /><MetricGrid metrics={metrics} /><section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Next in the chair</h2><Link href="/barber/appointments" className="text-[10px] tracking-[.18em] uppercase text-[var(--color-brass)]">View all</Link></div>{next.length ? <PortalTable columns={["Time","Client","Service","Status"]} rows={next.map((item) => ({ Time: dateTime(item.startsAt), Client: item.clientName, Service: item.service, Status: titleCase(item.status) }))} /> : <EmptyState title="No upcoming appointments" copy="Confirmed appointments assigned to this barber will appear here automatically." />}</section><div className="mt-8 grid gap-4 md:grid-cols-3"><ActionCard title="My calculated amounts" copy="Review commission basis, tips, statements, and the correction workflow." href="/barber/commissions" label="Open amounts" /><ActionCard title="My clients" copy="Review only clients connected to your own appointment history." href="/barber/clients" label="Open clients" /><ActionCard title="My profile" copy="Review your public profile, current availability, social link, and schedule." href="/barber/profile" label="Open profile" /></div></PortalShell>;
}

const pageCopy: Record<string, { eyebrow: string; title: string; copy: string }> = {
  today: { eyebrow: "Barber workspace", title: "Today", copy: "Your live chair, scheduled appointments, and assigned walk-ins for today." },
  appointments: { eyebrow: "Barber workspace", title: "Appointments", copy: "Your appointment history and upcoming schedule, including deposits and status." },
  calendar: { eyebrow: "Barber workspace", title: "Calendar", copy: "Your recurring schedule and appointment timing in the lounge timezone." },
  clients: { eyebrow: "Authorized records", title: "Clients", copy: "Clients attached to your own appointment history and operational work." },
  revenue: { eyebrow: "Barber workspace", title: "Revenue", copy: "Your service values and calculated barber amounts. Square-derived commission records remain the financial source." },
  performance: { eyebrow: "Barber workspace", title: "Performance", copy: "Your appointment completion, client activity, and calculated amount totals." },
  queue: { eyebrow: "Live operations", title: "Queue", copy: "Active walk-ins assigned to your chair, updated from the operational queue." },
  profile: { eyebrow: "Barber workspace", title: "Profile & availability", copy: "Your verified profile identity, public social link when provided, and working schedule." },
  portfolio: { eyebrow: "Published identity", title: "Portfolio & public profile", copy: "Your approved profile photo and public social identity currently used by the site." },
  notifications: { eyebrow: "Barber workspace", title: "Notifications", copy: "Your transactional notification history and delivery status." },
};

export async function BarberSectionLive({ slug }: { slug: string }) {
  const data = await loadBarberPortalData();
  const copy = pageCopy[slug] ?? pageCopy.today;
  return <PortalShell role="barber"><PortalHeader eyebrow={copy.eyebrow} title={copy.title} copy={copy.copy} />{section(slug, data)}</PortalShell>;
}

function section(slug: string, data: BarberPortalData) {
  const all = activeAppointments(data).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const isToday = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) === todayKey;
  if (slug === "today") {
    const items = all.filter((item) => isToday(item.startsAt));
    return <div className="grid gap-8"><MetricGrid metrics={[{ label: "Appointments today", value: String(items.length), note: "Your scheduled chairs today" }, { label: "Assigned walk-ins", value: String(data.queue.length), note: "Active queue assignments" }, { label: "Current statement", value: money(data.commission.currentAmountCents), note: data.commission.latestStatus ? titleCase(data.commission.latestStatus) : "No statement yet" }]} />{items.length ? <PortalTable columns={["Time","Client","Service","Deposit","Status"]} rows={items.map((item) => ({ Time: dateTime(item.startsAt), Client: item.clientName, Service: item.service, Deposit: titleCase(item.depositStatus), Status: titleCase(item.status) }))} /> : <EmptyState title="No appointments today" copy="Your confirmed appointments for today will appear here automatically." />}</div>;
  }
  if (slug === "appointments") return all.length ? <PortalTable columns={["Reference","Time","Client","Service","Value","Deposit","Status"]} rows={all.map((item) => ({ Reference: item.reference, Time: dateTime(item.startsAt), Client: item.clientName, Service: item.service, Value: money(item.serviceValueCents), Deposit: titleCase(item.depositStatus), Status: titleCase(item.status) }))} /> : <EmptyState title="No appointments yet" copy="Appointments assigned to this barber profile will appear here." />;
  if (slug === "calendar") return <div className="grid gap-8"><section className="portal-card"><h2 className="font-display text-2xl">Recurring schedule</h2>{data.schedule.length ? <div className="mt-5"><PortalTable columns={["Day","Start","End","Effective"]} rows={data.schedule.map((item) => ({ Day: weekday[item.weekday] ?? String(item.weekday), Start: time(item.start), End: time(item.end), Effective: item.effectiveTo ? `${item.effectiveFrom} to ${item.effectiveTo}` : `From ${item.effectiveFrom}` }))} /></div> : <p className="mt-4 text-sm text-[var(--color-bone-muted)]">No recurring schedule is linked to this portal account yet.</p>}</section>{all.length ? <PortalTable columns={["Appointment","Time","Service","Status"]} rows={all.slice(0, 60).map((item) => ({ Appointment: item.reference, Time: dateTime(item.startsAt), Service: item.service, Status: titleCase(item.status) }))} /> : null}</div>;
  if (slug === "clients") return data.clients.length ? <PortalTable columns={["Client","Phone","Email","Appointments","Last visit","Service value"]} rows={data.clients.map((item) => ({ Client: item.name, Phone: item.phone ?? "—", Email: item.email ?? "—", Appointments: String(item.appointments), "Last visit": dateTime(item.lastVisit), "Service value": money(item.serviceValueCents) }))} /> : <EmptyState title="No client records yet" copy="Clients become visible here only when they are attached to this barber's appointments." />;
  if (slug === "revenue") return <div className="grid gap-8"><MetricGrid metrics={[{ label: "Calculated barber amount", value: money(data.performance.calculatedCommissionCents), note: "Commission calculation records" }, { label: "Current weekly statement", value: money(data.commission.currentAmountCents), note: data.commission.latestPeriod ?? "No statement yet" }, { label: "Current commission basis", value: money(data.commission.currentBasisCents), note: "Tips are excluded from commission basis" }, { label: "Current tips", value: money(data.commission.tipsCents), note: "100% to barber under the confirmed policy" }]} /><ActionCard title="Transaction-level amounts" copy="Open the commission workspace for attribution, rate, tips, status, and dispute controls." href="/barber/commissions" label="Open commissions" /></div>;
  if (slug === "performance") return <MetricGrid metrics={[{ label: "Appointments", value: String(data.performance.appointmentCount), note: "All assigned appointment records" }, { label: "Completed", value: String(data.performance.completedCount), note: "Appointments marked completed" }, { label: "Unique clients", value: String(data.performance.uniqueClients), note: "Clients in your appointment history" }, { label: "Calculated amount", value: money(data.performance.calculatedCommissionCents), note: "Commission calculation records" }]} />;
  if (slug === "queue") return data.queue.length ? <PortalTable columns={["Token","Client","Service","Wait","Status"]} rows={data.queue.map((item) => ({ Token: item.token, Client: item.client, Service: titleCase(item.service), Wait: item.waitMinutes == null ? "—" : `${item.waitMinutes} min`, Status: titleCase(item.status) }))} /> : <EmptyState title="No assigned walk-ins" copy="Active queue assignments to your chair will appear here automatically." />;
  if (slug === "profile") return <div className="grid gap-5 lg:grid-cols-[18rem_1fr]"><section className="portal-card">{data.barber.portrait ? <Image src={data.barber.portrait} alt={data.barber.name} width={480} height={600} className="aspect-[4/5] w-full rounded-xl object-cover" /> : <div className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] text-sm text-[var(--color-bone-muted)]">Private test portal</div>}<h2 className="font-display mt-5 text-2xl">{data.barber.name}</h2><p className="mt-2 text-sm text-[var(--color-bone-muted)]">{data.barber.title}</p>{data.barber.socialUrl ? <a href={data.barber.socialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--color-brass)]">{data.barber.socialHandle ? `@${data.barber.socialHandle}` : "Social profile"}<ExternalLink className="h-3.5 w-3.5" /></a> : null}</section><section className="portal-card"><div className="grid gap-4 sm:grid-cols-2"><ProfileFact icon={<Scissors />} label="Availability" value={titleCase(data.barber.availabilityStatus)} /><ProfileFact icon={<UsersRound />} label="Walk-ins" value={data.barber.acceptingWalkIns ? "Accepting" : "Not accepting"} /><ProfileFact icon={<CircleDollarSign />} label="Current statement" value={money(data.commission.currentAmountCents)} /><ProfileFact icon={<Clock3 />} label="Schedule rows" value={String(data.schedule.length)} /></div>{data.schedule.length ? <div className="mt-7"><PortalTable columns={["Day","Hours"]} rows={data.schedule.map((item) => ({ Day: weekday[item.weekday] ?? String(item.weekday), Hours: `${time(item.start)} - ${time(item.end)}` }))} /></div> : null}</section></div>;
  if (slug === "portfolio") return data.barber.portrait ? <div className="grid gap-5 lg:grid-cols-[18rem_1fr]"><section className="portal-card"><Image src={data.barber.portrait} alt={data.barber.name} width={480} height={600} className="aspect-[4/5] w-full rounded-xl object-cover" /></section><section className="portal-card"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Published profile</p><h2 className="font-display mt-3 text-2xl">{data.barber.name}</h2><p className="mt-3 text-sm text-[var(--color-bone-muted)]">This is the approved professional profile image currently linked to your public barber identity.</p><div className="mt-5 flex flex-wrap gap-3">{data.barber.slug ? <Link href={`/barbers/${data.barber.slug}`} className="inline-flex items-center gap-2 text-xs text-[var(--color-brass)]">Open public profile <ExternalLink className="h-3.5 w-3.5" /></Link> : null}{data.barber.socialUrl ? <a href={data.barber.socialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-[var(--color-brass)]">{data.barber.socialHandle ? `@${data.barber.socialHandle}` : "Social profile"}<ExternalLink className="h-3.5 w-3.5" /></a> : null}</div></section></div> : <EmptyState title="No published profile media" copy="This private test account is not linked to a public barber identity." />;
  if (slug === "notifications") return data.notifications.length ? <PortalTable columns={["Date","Channel","Type","Status"]} rows={data.notifications.map((item) => ({ Date: dateTime(item.createdAt), Channel: titleCase(item.channel), Type: titleCase(item.template), Status: titleCase(item.status) }))} /> : <EmptyState title="No notifications yet" copy="Transactional messages sent to this barber account will appear here." />;
  return <EmptyState title="No records" copy="No records are available for this barber workspace section." />;
}

function ProfileFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-ink-line)] p-4"><span className="text-[var(--color-brass)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><p className="mt-3 text-[9px] uppercase tracking-[.18em] text-[var(--color-bone-muted)]">{label}</p><p className="mt-2 text-sm">{value}</p></div>;
}
