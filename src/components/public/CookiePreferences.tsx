"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const KEY = "lbl.cookie-choice";

export function CookiePreferences() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setVisible(!window.localStorage.getItem(KEY)); } catch { setVisible(false); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function choose(value: "essential" | "all") {
    try { window.localStorage.setItem(KEY, value); } catch { /* storage can be blocked */ }
    setVisible(false);
  }
  if (!visible || /^\/(client|barber|reception|admin|kiosk)(?:\/|$)/.test(pathname)) return null;
  return (
    <aside aria-label="Cookie preferences" className="fixed inset-x-4 bottom-[76px] z-[54] mx-auto max-w-3xl border border-[var(--color-ink-line)] bg-[#101010]/95 p-5 shadow-2xl backdrop-blur-xl md:bottom-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-[var(--color-bone-muted)]">Essential storage supports language and account functionality. Optional analytics remain disabled until configured. Read the <Link href="/cookies" className="text-[var(--color-brass)]">cookie notice</Link>.</p>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => choose("essential")} className="rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] tracking-[.16em] uppercase">Essential only</button><button type="button" onClick={() => choose("all")} className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Accept optional</button></div>
      </div>
    </aside>
  );
}
