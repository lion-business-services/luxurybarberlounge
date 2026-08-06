import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";
import { PortalShell, type PortalRole } from "./PortalShell";
import {
  ActionCard,
  Checklist,
  DemoModeBanner,
  EmptyState,
  PortalHeader,
  PortalTable,
  Toolbar,
} from "./PortalUI";
import { portalDemo } from "@/lib/content/platform";
import { barbers, services, tiers } from "@/lib/content/site";

const copy: Record<string, { title: string; eyebrow: string; description: string }> = {
  appointments: { title: "Appointments", eyebrow: "Client account", description: "Review upcoming and completed appointments, policies, deposits, and rebooking options." },
  rebook: { title: "Rebook", eyebrow: "Client account", description: "Repeat a previous service and preferred chair without rebuilding the request from scratch." },
  queue: { title: "Queue", eyebrow: "Live operations", description: "Monitor private queue status, estimated wait, assignments, and permitted manual controls." },
  membership: { title: "Membership", eyebrow: "Continuity", description: "Review plan benefits, usage, requests, renewal details, and feature-flagged billing status." },
  rewards: { title: "Rewards & referrals", eyebrow: "Engagement", description: "A transparent ledger for qualifying activity, referral state, and future benefits." },
  referrals: { title: "Referrals", eyebrow: "Engagement", description: "Share a referral code and review qualification and reward state." },
  offers: { title: "Offers", eyebrow: "Client account", description: "Relevant offers appear here only when eligibility and consent are confirmed." },
  inspiration: { title: "Inspiration", eyebrow: "Grooming profile", description: "Store private reference images for upcoming appointments and repeatable results." },
  privacy: { title: "Privacy & consent", eyebrow: "Client account", description: "Review consent history, data requests, and communication choices." },
  "grooming-profile": { title: "Grooming profile", eyebrow: "Preferences", description: "Save the details that help the barber reproduce a preferred result consistently." },
  notifications: { title: "Notifications", eyebrow: "Communication", description: "Control language, channels, marketing consent, and transactional delivery preferences." },
  feedback: { title: "Feedback", eyebrow: "Private service care", description: "Share satisfaction, report a concern, and track a support response before any optional review request." },
  account: { title: "Account", eyebrow: "Security & privacy", description: "Manage identity, consent history, sessions, data export, and deletion requests." },
  today: { title: "Today", eyebrow: "Barber workspace", description: "The active chair, arrivals, service notes, queue assignments, and next actions." },
  calendar: { title: "Calendar", eyebrow: "Barber workspace", description: "Square-synced appointments, walk-in assignments, breaks, and schedule requests." },
  clients: { title: "Clients", eyebrow: "Authorized records", description: "Operationally necessary client details, preferences, recent services, and rebooking opportunities." },
  portfolio: { title: "Portfolio", eyebrow: "Approved work", description: "Upload, tag, caption, and submit barber work for moderation and public profile use." },
  performance: { title: "Performance", eyebrow: "Barber workspace", description: "Service activity, utilization, rebooking, retention, reviews, and clearly labeled estimates." },
  revenue: { title: "Revenue", eyebrow: "Barber workspace", description: "Review clearly labeled service revenue, tips, adjustments, and reporting periods." },
  commissions: { title: "Commissions", eyebrow: "Reconciliation", description: "Transaction detail, attribution, versioned rules, tips, adjustments, and settlement status." },
  statements: { title: "Statements", eyebrow: "Reconciliation", description: "Weekly transaction detail, attribution basis, tips, adjustments, and final status." },
  disputes: { title: "Disputes", eyebrow: "Formal review", description: "Submit evidence within the permitted window and follow the manager decision history." },
  profile: { title: "Profile & availability", eyebrow: "Barber workspace", description: "Maintain public details, specialties, languages, and schedule-request information." },
  "schedule-requests": { title: "Schedule requests", eyebrow: "Barber workspace", description: "Submit availability and blocked-time requests for authorized review." },
  "time-off": { title: "Time off", eyebrow: "Barber workspace", description: "Request time away without altering Square-managed appointments directly." },
  resources: { title: "Resources", eyebrow: "Barber workspace", description: "Approved policies, training, announcements, and operating standards." },
  schedule: { title: "Schedule", eyebrow: "Reception console", description: "Search appointments, update arrival state, and assist guests without becoming a second booking authority." },
  "check-in": { title: "Client check-in", eyebrow: "Reception console", description: "Find or create a client, confirm consent, select a service, and create a safe operational record." },
  messages: { title: "Communications", eyebrow: "Reception console", description: "Prepare permitted transactional outreach using approved templates and channel preferences." },
  kiosk: { title: "Kiosk control", eyebrow: "Reception console", description: "Control tablet availability, idle reset, language, privacy reset, queue pause, and shop-closed state." },
  "shop-status": { title: "Shop status", eyebrow: "Reception console", description: "Publish open, closed, capacity, and queue-pause states without exposing private data." },
  operations: { title: "Operations", eyebrow: "Admin & owner", description: "Today’s floor, capacity, bookings, queue, exceptions, and integration health in one view." },
  bookings: { title: "Bookings", eyebrow: "Admin & owner", description: "Search booking records, source, barber, payment status, reminders, and Square mapping state." },
  barbers: { title: "Barbers & staff", eyebrow: "Admin & owner", description: "Profiles, roles, services, schedules, documents, performance, commission rules, and status." },
  services: { title: "Services & pricing", eyebrow: "Admin & owner", description: "Edit public service content, durations, pricing, deposits, eligibility, SEO, and Square mapping." },
  memberships: { title: "Memberships", eyebrow: "Admin & owner", description: "Plan content, billing mapping, members, usage, requests, promotions, and exceptions." },
  content: { title: "Content management", eyebrow: "Admin & owner", description: "Manage pages, navigation, barbers, gallery, journal, FAQs, policies, media, and publish state." },
  marketing: { title: "Marketing", eyebrow: "Admin & owner", description: "Segments, campaigns, referrals, reviews, reactivation, and consent-safe audience activity." },
  automations: { title: "Automations", eyebrow: "Admin & owner", description: "Triggers, conditions, timing, channels, templates, run history, retries, and suppression controls." },
  analytics: { title: "Analytics", eyebrow: "Admin & owner", description: "Clearly labeled Square-derived, Supabase-derived, calculated, estimated, and demo metrics." },
  integrations: { title: "Integrations", eyebrow: "Admin & owner", description: "Credential-safe status for Square, Supabase, email, SMS, AI, analytics, and monitoring." },
  users: { title: "Users, roles & permissions", eyebrow: "Admin & owner", description: "Invite staff, assign authorized roles, review access, and prevent privilege escalation." },
  settings: { title: "Business settings", eyebrow: "Admin & owner", description: "Brand, location, hours, policies, booking rules, feature flags, security, data, and AI behavior." },
};

const sampleRows: Record<string, Array<Record<string, string>>> = {
  appointments: portalDemo.client.appointments.map((item) => ({ ...item })),
  today: portalDemo.barber.schedule.map((item) => ({ ...item })),
  queue: portalDemo.reception.queue.map((item) => ({ ...item })),
  schedule: portalDemo.barber.schedule.map((item) => ({ ...item })),
  bookings: portalDemo.client.appointments.map((item, index) => ({ ID: `BK-${1042 + index}`, Date: item.date, Client: index === 0 ? "M. Alvarez" : "Demo client", Service: item.service, Barber: item.barber, Status: item.status })),
  clients: [
    { Client: "M. Alvarez", Last: "Jul 11", Favorite: "Rubén", Segment: "Returning", Status: "Active" },
    { Client: "J. Rivera", Last: "Jun 14", Favorite: "Carlos", Segment: "Membership prospect", Status: "Active" },
    { Client: "T. Martin", Last: "May 22", Favorite: "First available", Segment: "Lapsed", Status: "Review" },
  ],
  barbers: barbers.map((barber) => ({ Barber: barber.name, Title: barber.title.en, Languages: barber.languages, Services: String(barber.serviceSlugs.length), Status: barber.contentStatus === "confirmed" ? "Active" : "Review" })),
  services: services.slice(0, 12).map((service) => ({ Service: service.name.en, Category: service.category, Duration: `${service.minutes} min`, Price: `$${service.from}`, Deposit: `$${service.deposit}`, Status: service.contentStatus === "confirmed" ? "Published" : "Review" })),
  memberships: tiers.map((tier) => ({ Plan: tier.name.en, Price: `$${tier.price}`, Interval: tier.cadence.en, Benefits: String(tier.perks.length), Status: "Configured" })),
  automations: [
    { Automation: "Booking confirmation", Trigger: "Booking created", Channel: "Email + SMS", Status: "Ready" },
    { Automation: "24-hour reminder", Trigger: "Appointment approaching", Channel: "SMS", Status: "Ready" },
    { Automation: "Review request", Trigger: "Service completed", Channel: "Email", Status: "Review" },
    { Automation: "Lapsed-client win-back", Trigger: "Client segment", Channel: "Email + SMS", Status: "Disabled" },
  ],
  integrations: [
    { Provider: "Supabase", Purpose: "Auth, database, storage", Mode: "Adapter ready", Status: "Credentials required" },
    { Provider: "Square", Purpose: "Catalog, booking, money", Mode: "Sandbox-ready", Status: "Credentials required" },
    { Provider: "Email", Purpose: "Transactional messages", Mode: "Provider abstraction", Status: "Provider required" },
    { Provider: "SMS", Purpose: "Reminders and queue", Mode: "Provider abstraction", Status: "Provider required" },
    { Provider: "AI", Purpose: "Grounded concierge", Mode: "Rules fallback", Status: "Optional" },
  ],
  users: [
    { User: "Owner preview", Role: "Owner", Location: "Northfield", Status: "Demo" },
    { User: "Manager preview", Role: "Manager", Location: "Northfield", Status: "Demo" },
    { User: "Reception preview", Role: "Receptionist", Location: "Northfield", Status: "Demo" },
    { User: "Barber preview", Role: "Barber", Location: "Northfield", Status: "Demo" },
  ],
};

const columns: Record<string, string[]> = {
  appointments: ["Date", "Service", "Barber", "Status", "Total"],
  today: ["Time", "Client", "Service", "Status"],
  queue: ["Token", "Service", "Preference", "Wait", "Status"],
  schedule: ["Time", "Client", "Service", "Status"],
  bookings: ["ID", "Date", "Client", "Service", "Barber", "Status"],
  clients: ["Client", "Last", "Favorite", "Segment", "Status"],
  barbers: ["Barber", "Title", "Languages", "Services", "Status"],
  services: ["Service", "Category", "Duration", "Price", "Deposit", "Status"],
  memberships: ["Plan", "Price", "Interval", "Benefits", "Status"],
  automations: ["Automation", "Trigger", "Channel", "Status"],
  integrations: ["Provider", "Purpose", "Mode", "Status"],
  users: ["User", "Role", "Location", "Status"],
};

function defaultChecklist(role: PortalRole, slug: string) {
  if (role === "client") return ["Own-record access only through Supabase RLS", "Language and channel preferences", "Data export and deletion request workflow", "Booking actions hand off to Square when activated"];
  if (role === "barber") return ["Assigned operational records only", "No access to another barber’s private financial data", "Portfolio moderation before publishing", "Disputes create adjustments instead of rewriting history"];
  if (role === "reception") return ["No integration secrets or owner financial configuration", "Private queue tokens for public displays", "Limited operational notes", "Manager escalation for exceptions"];
  return [`Module: ${slug}`, "Role-aware access and audit trail", "Loading, empty, error, and confirmation states", "Feature flags hide unavailable functionality cleanly"];
}

function primaryAction(role: PortalRole, slug: string) {
  if (role === "client") return slug === "appointments" ? "/book" : "/client";
  if (role === "barber") return "/barber/today";
  if (role === "reception") return "/reception/check-in";
  if (slug === "services") return "/admin/pricing";
  if (slug === "content") return "/admin/content?section=homepage";
  return "/admin/operations";
}

export function PortalSectionPage({ role, slug }: { role: PortalRole; slug: string }) {
  const page = copy[slug] ?? { title: slug.replaceAll("-", " "), eyebrow: `${role} portal`, description: "A polished, responsive workspace with safe development data and a defined live-provider boundary." };
  const rows = sampleRows[slug];
  const tableColumns = columns[slug];
  return (
    <PortalShell role={role}>
      <DemoModeBanner />
      <PortalHeader
        eyebrow={page.eyebrow}
        title={page.title}
        copy={page.description}
        actions={
          <Link href={primaryAction(role, slug)} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]">
            <Plus className="h-4 w-4" /> New action
          </Link>
        }
      />
      {rows && tableColumns ? <><Toolbar placeholder={`Search ${page.title.toLowerCase()}`} /><PortalTable columns={tableColumns} rows={rows} /></> : <SpecialContent role={role} slug={slug} />}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ActionCard title="Access model" copy="The production data layer enforces role and ownership in RLS, not merely by hiding interface controls." href="/admin/roles" label="Review roles" />
        <ActionCard title="Integration boundary" copy="Square remains operational and financial truth while Supabase stores extensions, portals, automation, and audit records." href="/admin/integrations" label="View boundaries" />
        <ActionCard title="Launch controls" copy="Credential-dependent actions remain disabled or explicitly marked until provider activation." href="/admin/feature-flags" label="Feature flags" />
      </div>
    </PortalShell>
  );
}

function SpecialContent({ role, slug }: { role: PortalRole; slug: string }) {
  if (slug === "grooming-profile") return <div className="grid gap-5 lg:grid-cols-2"><section className="portal-card"><h2 className="font-display text-2xl">Preferred result</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Preferred haircut" value="Low taper · textured top" /><Field label="Guard preference" value="#1.5 at the base" /><Field label="Beard preference" value="Natural cheek · clean neckline" /><Field label="Product finish" value="Matte · medium hold" /></div></section><section className="portal-card"><h2 className="font-display text-2xl">Privacy by design</h2><div className="mt-5"><Checklist items={defaultChecklist(role, slug)} /></div></section></div>;
  if (slug === "content") {
    const items = ["homepage", "services", "barber-profiles", "gallery", "journal", "faqs", "policies", "seo-metadata"];
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <ActionCard key={item} title={item.replaceAll("-", " ")} copy="Draft, review, approved, published, and archived content states with validation and preview." href={`/admin/content?section=${item}`} label="Open editor" />)}</div>;
  }
  if (slug === "analytics") return <div className="grid gap-4 md:grid-cols-2"><section className="portal-card"><h2 className="font-display text-2xl">Metric labeling</h2><div className="mt-5"><Checklist items={["Square-derived values", "Supabase-derived values", "Calculated values", "Estimated values", "Demo values"]} /></div></section><section className="portal-card"><h2 className="font-display text-2xl">Reporting surfaces</h2><div className="mt-5"><Checklist items={["Date ranges and prior-period comparison", "Revenue, bookings, queue, retention, utilization", "Attribution and commission liability", "Campaign and integration health"]} /></div></section></div>;
  if (slug === "commissions" || slug === "disputes" || slug === "statements") return <div className="grid gap-4 md:grid-cols-2"><section className="portal-card"><div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Versioned calculation model</h2></div><div className="mt-5"><Checklist items={["Service basis separated from tips and tax", "Attribution rule and version preserved", "Refunds and adjustments create new records", "Locked periods never silently change"]} /></div></section><section className="portal-card"><h2 className="font-display text-2xl">Review workflow</h2><div className="mt-5"><Checklist items={["Configurable deadline", "Reason and evidence", "Manager approval, denial, or more information", "Barber-visible decision history"]} /></div></section></div>;
  if (["settings", "business-settings"].includes(slug)) {
    const items = [
      ["Business information", "/admin/business-settings"], ["Locations & hours", "/admin/hours"], ["Booking rules", "/admin/bookings"], ["Policies", "/admin/policies"], ["Notifications", "/admin/notification-settings"], ["Feature flags", "/admin/feature-flags"], ["Security", "/admin/roles"], ["AI behavior", "/admin/ai-settings"], ["Data controls", "/admin/data-controls"],
    ] as const;
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(([title, href]) => <ActionCard key={title} title={title} copy="Centralized setting with audit-ready change history and safe production defaults." href={href} label="Review setting" />)}</div>;
  }
  if (slug === "marketing") {
    const items = ["birthday", "rebooking", "lapsed-client", "membership", "last-minute-openings", "referral"];
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ActionCard key={item} title={`${item.replaceAll("-", " ")} campaign`} copy="Consent-aware audience rules, approved templates, quiet hours, and delivery history." href={`/admin/campaigns?type=${item}`} label="Open campaign" />)}</div>;
  }
  if (slug === "operations") return <div className="grid gap-4 md:grid-cols-2"><section className="portal-card"><h2 className="font-display text-2xl">Operational checklist</h2><div className="mt-5"><Checklist items={["Review arrivals and late clients", "Resolve missing service or barber mappings", "Monitor queue capacity", "Review failed webhooks and messages"]} /></div></section><section className="portal-card"><h2 className="font-display text-2xl">System health</h2><div className="mt-5 space-y-3">{["Supabase", "Square", "Email", "SMS", "AI"].map((item) => <div key={item} className="flex items-center justify-between border-b border-[var(--color-ink-line)] pb-3 text-sm"><span>{item}</span><span className="text-amber-200">Awaiting activation</span></div>)}</div></section></div>;
  if (["rebook", "membership", "rewards", "referrals", "offers", "inspiration", "privacy", "notifications", "feedback", "account", "performance", "revenue", "portfolio", "profile", "schedule-requests", "time-off", "resources", "check-in", "messages", "kiosk", "shop-status"].includes(slug)) return <div className="grid gap-4 md:grid-cols-2"><section className="portal-card"><h2 className="font-display text-2xl">Operational workspace</h2><p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">The responsive workflow, controls, state handling, and provider boundary are in place. Credential-dependent writes stay safely disabled until production services and final owner rules are activated.</p></section><section className="portal-card"><h2 className="font-display text-2xl">Production safeguards</h2><div className="mt-5"><Checklist items={defaultChecklist(role, slug)} /></div></section></div>;
  return <EmptyState title="No records yet" copy="No records are available in the current development dataset. The same surface reads authorized Supabase or Square records after provider activation." action={{ href: role === "client" ? "/book" : `/${role}`, label: "Return to dashboard" }} />;
}

function Field({ label, value }: { label: string; value: string }) {
  return <label><span className="form-label">{label}</span><input className="form-control" defaultValue={value} /></label>;
}
