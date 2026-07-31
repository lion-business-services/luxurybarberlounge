import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  ContactRound,
  Scissors,
  ShieldAlert,
  WandSparkles,
} from "lucide-react";
import { loadAdminPortalData } from "@/lib/portal/admin-data";
import { dateTime, titleCase } from "@/lib/portal/format";
import styles from "./admin-portal.module.css";

export async function AdminDashboard() {
  const data = await loadAdminPortalData();
  const metric = (label: string) => data.metrics.find((item) => item.label === label);
  const activeBarbers = data.barbers.filter((barber) => barber.active && barber.status !== "archived").length;
  const appointments = metric("Appointments today");
  const queue = metric("Active queue");
  const revenue = metric("Service revenue today");
  const automationState = data.failures.length ? "Needs attention" : "Running normally";
  const connectedSystems = data.systems.filter((system) => ["active", "connected", "configured", "healthy"].includes(system.status.toLowerCase())).length;

  return (
    <div className={styles.grid}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">Shop operations</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">Today at the lounge</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">
            Appointments, walk-ins, clients, barbers, commissions, and automations. The essentials, without turning a barbershop into mission control.
          </p>
        </div>
        <Link href="/admin/appointments" className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">
          View schedule <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      {data.failures.length ? (
        <div className={styles.alert} role="status">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong className="text-xs">{data.failures.length} automation or sync issue{data.failures.length === 1 ? "" : "s"} need attention.</strong>
            <p className="mt-1 text-[11px] opacity-80">Open Automations or Settings to review the latest failure.</p>
          </div>
        </div>
      ) : null}

      {data.configured ? (
        <section className={styles.metricGrid} aria-label="Today’s shop metrics">
          <Metric label="Appointments" value={appointments?.value ?? "0"} note="Scheduled today" source={appointments?.source ?? "Square-derived"} />
          <Metric label="Waiting" value={queue?.value ?? "0"} note="Active walk-in queue" source={queue?.source ?? "Supabase-derived"} />
          <Metric label="Barbers" value={String(activeBarbers)} note="Active profiles" source="Supabase-derived" />
          <Metric label="Revenue" value={revenue?.value ?? "$0.00"} note="Synced payments today" source={revenue?.source ?? "Square-derived"} />
        </section>
      ) : (
        <div className={styles.empty}>The operations dashboard is waiting for an authenticated Supabase session.</div>
      )}

      <section className={`${styles.grid} ${styles.gridTwo}`}>
        <article className={styles.card}>
          <div className={styles.toolbar}>
            <div>
              <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Live walk-ins</p>
              <h2 className="font-display mt-2 text-2xl">Current queue</h2>
            </div>
            <Link href="/admin/queue" className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">Manage queue</Link>
          </div>
          {data.queue.length ? (
            <div>
              {data.queue.slice(0, 5).map((row) => (
                <div key={String(row.id)} className={styles.queueItem}>
                  <div>
                    <strong className="text-sm">{String(row.client_name ?? "Walk-in guest")}</strong>
                    <p className="mt-1 text-xs text-[var(--color-bone-muted)]">
                      {String(row.service_slug ?? "Service pending").replaceAll("-", " ")} · {dateTime(String(row.joined_at))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/[.04] px-2 py-1 text-[8px] tracking-[.12em] uppercase text-[var(--color-brass)]">{titleCase(String(row.status))}</span>
                    <span className="text-xs text-[var(--color-bone-muted)]">{typeof row.estimated_wait_minutes === "number" ? `${row.estimated_wait_minutes} min` : "Pending"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No guests are waiting.</div>
          )}
        </article>

        <aside className={styles.card}>
          <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Automated operations</p>
          <h2 className="font-display mt-2 text-2xl">Shop pulse</h2>
          <div className={`${styles.pulseGrid} mt-5`}>
            <Pulse label="Automations" value={automationState} />
            <Pulse label="Connected systems" value={data.systems.length ? `${connectedSystems}/${data.systems.length}` : "Awaiting setup"} />
            <Pulse label="Active barbers" value={String(activeBarbers)} />
            <Pulse label="Client profiles" value={String(data.clients.length)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/automations" className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">Automations</Link>
            <Link href="/admin/settings" className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">Settings</Link>
          </div>
        </aside>
      </section>

      <section>
        <div className={styles.toolbar}>
          <div>
            <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Quick controls</p>
            <h2 className="font-display mt-2 text-2xl">Run the shop</h2>
          </div>
        </div>
        <div className={styles.actionGrid}>
          <AdminAction href="/admin/appointments" icon={CalendarDays} title="Appointments" copy="Schedule and status" />
          <AdminAction href="/admin/queue" icon={ClipboardList} title="Queue" copy="Walk-ins and assignments" />
          <AdminAction href="/admin/clients" icon={ContactRound} title="Clients" copy="Profiles and history" />
          <AdminAction href="/admin/barbers" icon={Scissors} title="Barbers" copy="Profiles and availability" />
          <AdminAction href="/admin/commissions" icon={CircleDollarSign} title="Commissions" copy="Calculated amounts" />
          <AdminAction href="/admin/automations" icon={WandSparkles} title="Automations" copy="Rules and delivery" />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note, source }: { label: string; value: string; note: string; source: string }) {
  return (
    <article className={styles.metric}>
      <p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-bone-muted)]">{label}</p>
      <p className={styles.metricValue}>{value}</p>
      <p className="mt-1 text-[10px] text-[var(--color-bone-muted)]">{note}</p>
      <span className={styles.source}>{source}</span>
    </article>
  );
}

function Pulse({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.pulseItem}>
      <span className="text-xs text-[var(--color-bone-muted)]">{label}</span>
      <strong className="text-xs text-[var(--color-bone)]">{value}</strong>
    </div>
  );
}

function AdminAction({ href, icon: Icon, title, copy }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; copy: string }) {
  return (
    <Link href={href} className={styles.actionCard}>
      <Icon className="h-5 w-5 text-[var(--color-brass)]" />
      <div>
        <h3 className="font-display text-lg">{title}</h3>
        <p className="mt-1 text-[11px] leading-4 text-[var(--color-bone-muted)]">{copy}</p>
      </div>
    </Link>
  );
}
