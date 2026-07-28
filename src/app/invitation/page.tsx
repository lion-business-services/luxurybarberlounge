import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Staff Invitation", robots: { index: false, follow: false } };

export default function InvitationPage() {
  return (
    <main className="grid min-h-[70svh] place-items-center px-6 py-16">
      <section className="w-full max-w-lg border border-[var(--color-brass)]/25 bg-[var(--color-ink-soft)] p-8 text-center sm:p-10">
        <ShieldCheck className="mx-auto h-9 w-9 text-[var(--color-brass)]" />
        <p className="mt-6 text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Management invitation only</p>
        <h1 className="font-display mt-4 text-4xl">Staff access is never self-assigned.</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">A barber, reception, manager, owner, or technical role must be invited and approved by authorized management. Use the secure link delivered to your approved email address.</p>
        <Link href="/login" className="mt-8 inline-flex rounded-full border border-[var(--color-brass)]/45 px-7 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Return to login</Link>
      </section>
    </main>
  );
}
