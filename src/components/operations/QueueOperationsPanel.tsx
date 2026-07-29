"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

type QueueEntry = {
  id: string;
  public_token: string;
  client_name: string | null;
  service_slug: string | null;
  barber_preference: string | null;
  status: string;
  estimated_wait_minutes: number | null;
  joined_at: string;
};

type QueueResponse = {
  entries?: QueueEntry[];
  live?: boolean;
  message?: string;
  decision?: { reasons?: string[] };
};

export function QueueOperationsPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const applyResponse = useCallback((result: QueueResponse) => {
    setEntries(result.entries ?? []);
    setLive(Boolean(result.live));
    if (result.message) setMessage(result.message);
  }, []);

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/operations/queue", {
      cache: "no-store",
      signal,
    });
    const result = (await response.json()) as QueueResponse;

    if (!response.ok) {
      throw new Error(result.message ?? "The queue could not be loaded.");
    }

    applyResponse(result);
  }, [applyResponse]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/operations/queue", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as QueueResponse;
        if (!response.ok) {
          throw new Error(result.message ?? "The queue could not be loaded.");
        }
        return result;
      })
      .then(applyResponse)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "The queue could not be loaded.");
      });

    return () => controller.abort();
  }, [applyResponse]);

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The queue could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  async function action(payload: Record<string, string>) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/operations/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as QueueResponse;

      if (!response.ok) {
        throw new Error(result.message ?? "The queue could not be updated.");
      }

      setMessage(result.decision?.reasons?.join(" · ") || "Queue updated.");
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The queue could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">
            Live operations
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">
            Queue &amp; Who’s Next
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">
            Deterministic assignment based on appointment timing, check-in order,
            service eligibility, requested Barber, availability, workload, and
            authorized overrides.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => action({ action: "who_next" })}
            disabled={busy || !live}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Who’s next
          </button>
        </div>
      </header>

      {message ? (
        <div
          role="status"
          className="mb-5 rounded-lg border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5 px-4 py-3 text-xs leading-5"
        >
          {message}
        </div>
      ) : null}

      {busy && entries.length === 0 ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-[var(--color-brass)]" />
        </div>
      ) : entries.length ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Client</th>
                <th>Service</th>
                <th>Preference</th>
                <th>Wait</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.public_token}</td>
                  <td>{entry.client_name ?? "Guest"}</td>
                  <td>{entry.service_slug ?? "Service"}</td>
                  <td>{entry.barber_preference ?? "First available"}</td>
                  <td>
                    {entry.estimated_wait_minutes == null
                      ? "Estimate pending"
                      : `${entry.estimated_wait_minutes} min`}
                  </td>
                  <td>{entry.status}</td>
                  <td>
                    <select
                      value={entry.status}
                      onChange={(event) =>
                        action({
                          action: "set_status",
                          entryId: entry.id,
                          status: event.target.value,
                        })
                      }
                      className="form-control min-w-36 text-xs"
                    >
                      <option value="waiting">Waiting</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked in</option>
                      <option value="assigned">Assigned</option>
                      <option value="called">Called</option>
                      <option value="ready">Ready</option>
                      <option value="in_service">In service</option>
                      <option value="completed">Completed</option>
                      <option value="no_show">No-show</option>
                      <option value="removed">Removed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center">
          <div>
            <h2 className="font-display text-2xl">No active queue entries.</h2>
            <p className="mt-3 text-sm text-[var(--color-bone-muted)]">
              {live
                ? "New appointments and walk-ins will appear here."
                : "Apply the Supabase migrations and enable the queue feature when operations are ready."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
