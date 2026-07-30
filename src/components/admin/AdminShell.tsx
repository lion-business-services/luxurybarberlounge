"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Bell, CalendarDays, CircleDollarSign, ClipboardList, ContactRound, FileText, Gauge, Gift, LayoutDashboard, LogOut, Menu, Package, Scissors, Settings, ShieldCheck, ShoppingBag, Sparkles, UsersRound, WalletCards, Webhook, X, WandSparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { AppRole } from "@/lib/supabase/types";
import styles from "./admin-portal.module.css";

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; ownerOnly?: boolean };
type Group = { label: string; items: Item[] };
const groups: Group[] = [
  { label: "Command", items: [
    { label: "Executive dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Today", href: "/admin/today", icon: Gauge },
    { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
    { label: "Queue", href: "/admin/queue", icon: ClipboardList },
  ]},
  { label: "CRM", items: [
    { label: "Clients", href: "/admin/clients", icon: ContactRound },
    { label: "Barbers", href: "/admin/barbers", icon: Scissors },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Memberships", href: "/admin/memberships", icon: WalletCards },
    { label: "Services", href: "/admin/services", icon: Sparkles },
    { label: "Packages", href: "/admin/packages", icon: Package },
    { label: "Gift cards", href: "/admin/gift-cards", icon: Gift },
  ]},
  { label: "Financial operations", items: [
    { label: "Attribution", href: "/admin/attribution", icon: FileText, ownerOnly: true },
    { label: "Calculated amounts", href: "/admin/commissions", icon: CircleDollarSign, ownerOnly: true },
    { label: "Statements", href: "/admin/statements", icon: FileText, ownerOnly: true },
    { label: "Disputes", href: "/admin/disputes", icon: ShieldCheck, ownerOnly: true },
  ]},
  { label: "Growth & system", items: [
    { label: "Automations", href: "/admin/automations", icon: WandSparkles },
    { label: "Campaigns", href: "/admin/campaigns", icon: Bell },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Integrations", href: "/admin/integrations", icon: Activity, ownerOnly: true },
    { label: "Webhooks", href: "/admin/webhooks", icon: Webhook, ownerOnly: true },
    { label: "Content", href: "/admin/content", icon: FileText },
  ]},
  { label: "Governance", items: [
    { label: "Users", href: "/admin/users", icon: UsersRound, ownerOnly: true },
    { label: "Roles", href: "/admin/roles", icon: ShieldCheck, ownerOnly: true },
    { label: "Audit", href: "/admin/audit", icon: FileText, ownerOnly: true },
    { label: "Security", href: "/admin/security", icon: ShieldCheck, ownerOnly: true },
    { label: "Settings", href: "/admin/settings", icon: Settings, ownerOnly: true },
  ]},
];
function active(pathname:string, href:string){ return href==="/admin" ? pathname===href : pathname.startsWith(href); }
function Navigation({ pathname, owner, onNavigate }: { pathname: string; owner: boolean; onNavigate?: () => void }) {
  return <>{groups.map((group)=>{
    const items=group.items.filter((item)=>owner || !item.ownerOnly);
    if (!items.length) return null;
    return <section key={group.label} className={styles.group}><h2 className={styles.groupLabel}>{group.label}</h2><nav aria-label={group.label}>{items.map((item)=>{const Icon=item.icon; return <Link key={item.href} href={item.href} onClick={onNavigate} data-active={active(pathname,item.href)} className={styles.navLink}><Icon className="h-4 w-4 shrink-0"/><span>{item.label}</span></Link>;})}</nav></section>;
  })}</>;
}
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [email,setEmail]=useState<string|null>(null); const [roles,setRoles]=useState<AppRole[]>([]);
  useEffect(()=>{let mounted=true; fetch("/api/auth/session",{cache:"no-store"}).then(r=>r.json()).then((d:{email?:string|null;roles?:AppRole[]})=>{if(mounted){setEmail(d.email??null);setRoles(d.roles??[])}}).catch(()=>undefined); return()=>{mounted=false}},[]);
  const owner=useMemo(()=>roles.includes("owner")||roles.includes("super_admin"),[roles]);
  async function logout(){await fetch("/api/auth/logout",{method:"POST"}); router.replace("/login"); router.refresh();}
  return <div className={styles.shell} data-admin-portal>
    <aside className={styles.sidebar} aria-label="Owner and admin navigation"><div className={styles.brand}><Logo compact/><p className="mt-3 text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">{owner?"Owner CRM":"Manager operations"}</p><p className="mt-1 truncate text-[10px] text-[var(--color-bone-muted)]">{email??"Secure operations"}</p></div><Navigation pathname={pathname} owner={owner}/><button type="button" onClick={logout} className={`${styles.navLink} mt-5 w-full`}><LogOut className="h-4 w-4"/>Secure sign out</button></aside>
    <div className={styles.mobileBar}><div><p className="text-[9px] tracking-[.22em] uppercase text-[var(--color-brass)]">{owner?"Owner CRM":"Manager operations"}</p><p className="max-w-[13rem] truncate text-xs text-[var(--color-bone-muted)]">{email??"Secure operations"}</p></div><button type="button" onClick={()=>setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Open admin navigation"><Menu className="h-4 w-4"/></button></div>
    {open?<div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Admin navigation"><div className={styles.drawerPanel}><div className="flex items-center justify-between"><Logo compact/><button type="button" onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Close navigation"><X className="h-4 w-4"/></button></div><Navigation pathname={pathname} owner={owner} onNavigate={()=>setOpen(false)}/><button type="button" onClick={logout} className={`${styles.navLink} mt-5 w-full`}><LogOut className="h-4 w-4"/>Secure sign out</button></div><button type="button" className={styles.drawerBackdrop} onClick={()=>setOpen(false)} aria-label="Close navigation"/></div>:null}
    <main className={styles.main}>{children}</main>
  </div>;
}
