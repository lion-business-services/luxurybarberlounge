"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

type StubKey = "services" | "barbers" | "membership" | "visit" | "about";

export function StubPage({ stub }: { stub: StubKey }) {
  const { lang } = useLang();
  const entry = dict.stub[stub];

  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:px-10 md:py-36">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-oxblood)]/60 px-3 py-1 text-[10px] tracking-[0.32em] uppercase text-[var(--color-oxblood)]">
        <span className="h-1 w-1 rounded-full bg-[var(--color-oxblood)]" aria-hidden />
        {dict.stub.badge[lang]}
      </span>

      <h1 className="font-display mt-8 text-5xl leading-tight tracking-tight text-[var(--color-bone)] md:text-6xl">
        {entry.title[lang]}
      </h1>

      <div className="hairline my-10 max-w-[120px]" />

      <p className="max-w-xl text-lg leading-relaxed text-[var(--color-bone)]/85">
        {entry.body[lang]}
      </p>

      <Link
        href="/"
        className="group mt-12 inline-flex items-center gap-2 text-[11px] tracking-[0.28em] uppercase text-[var(--color-brass)] transition-colors hover:text-[var(--color-brass-light)]"
      >
        <ArrowUpRight
          className="h-4 w-4 -rotate-90 transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
        {dict.nav.home[lang]}
      </Link>
    </section>
  );
}
