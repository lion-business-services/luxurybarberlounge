"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, ShieldCheck, Clock } from "lucide-react";

type Item = {
  id: string;
  url: string | null;
  caption: string | null;
  alt_text: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  review_note: string | null;
  client_consent: boolean;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  approved: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
  pending: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  rejected: "border-rose-400/50 bg-rose-400/10 text-rose-300",
  archived: "border-white/15 bg-white/5 text-[var(--color-bone-muted)]",
};

const statusLabels: Record<string, string> = {
  approved: "Live on your public profile",
  pending: "Waiting for approval",
  rejected: "Not approved",
  archived: "Archived",
};

export function BarberPortfolioManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showsClient, setShowsClient] = useState(false);
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/barber/portfolio", { cache: "no-store" });
      const result = await response.json();
      setItems(result.items ?? []);
    } catch {
      setMessage("Your portfolio could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("showsClient", String(showsClient));
    form.set("clientConsent", String(consent));

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/barber/portfolio", { method: "POST", body: form });
      const result = await response.json();
      setMessage(result.message ?? (result.ok ? "Uploaded." : "Upload failed."));
      if (result.ok) {
        event.currentTarget.reset();
        setShowsClient(false);
        setConsent(false);
        if (fileRef.current) fileRef.current.value = "";
        await load();
      }
    } catch {
      setMessage("The upload could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/barber/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="portal-card">
        <h2 className="font-display text-2xl">Add work</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-bone-muted)]">
          Upload photos of your cuts. Images are reviewed before they appear on
          your public profile.
        </p>

        <form onSubmit={upload} className="mt-5 grid gap-4">
          <label>
            <span className="form-label">Photo</span>
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              required
              className="form-control"
            />
            <span className="mt-1 block text-[11px] text-[var(--color-bone-muted)]">
              JPEG, PNG, WEBP or HEIC · up to 8 MB
            </span>
          </label>

          <label>
            <span className="form-label">Caption</span>
            <input name="caption" maxLength={280} className="form-control" placeholder="Skin fade with beard line-up" />
          </label>

          <label>
            <span className="form-label">Describe the image</span>
            <input name="altText" maxLength={200} className="form-control" placeholder="For visually impaired visitors" />
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={showsClient}
              onChange={(event) => setShowsClient(event.target.checked)}
              className="mt-1"
            />
            <span>This photo shows a client</span>
          </label>

          {showsClient ? (
            <label className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1"
              />
              <span>
                I confirm this client agreed to their photo being used publicly
                by Luxury Barber Lounge.
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={busy || (showsClient && !consent)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload
          </button>

          {message ? (
            <p className="text-xs text-[var(--color-bone-muted)]">{message}</p>
          ) : null}
        </form>
      </section>

      <section className="portal-card">
        <h2 className="font-display text-2xl">Your portfolio</h2>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-bone-muted)]">Loading…</p>
        ) : !items.length ? (
          <p className="mt-4 text-sm text-[var(--color-bone-muted)]">
            No photos yet. Upload your best work to build your public profile.
          </p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-xl border border-[var(--color-ink-line)]">
                {item.url ? (
                  <Image
                    src={item.url}
                    alt={item.alt_text ?? item.caption ?? "Portfolio image"}
                    width={480}
                    height={480}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center text-xs text-[var(--color-bone-muted)]">
                    Preview unavailable
                  </div>
                )}
                <div className="p-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] tracking-[.14em] uppercase ${statusStyles[item.status]}`}
                  >
                    {item.status === "approved" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {statusLabels[item.status]}
                  </span>
                  {item.caption ? (
                    <p className="mt-2 text-sm text-[var(--color-bone)]">{item.caption}</p>
                  ) : null}
                  {item.review_note ? (
                    <p className="mt-1 text-xs text-rose-300">{item.review_note}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={busy}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-bone-muted)] hover:text-rose-300 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
