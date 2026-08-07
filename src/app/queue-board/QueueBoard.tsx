"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Clock3,
  Maximize2,
  RefreshCw,
  Scissors,
  Wifi,
  WifiOff,
} from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase/client";

type Entry = {
  position: number;
  label: string;
  token: string;
  barber: string;
  status: string;
  estimatedWaitMinutes: number | null;
};

type QueueResponse = {
  ok?: boolean;
  location?: string;
  generatedAt?: string;
  entries?: Entry[];
};

type RealtimeState =
  | "connecting"
  | "live"
  | "fallback";

const servingStatuses = new Set([
  "called",
  "ready",
  "in_service",
]);

/*
 * Realtime is the primary synchronization mechanism.
 *
 * This interval is deliberately slower because it exists only as a
 * reconciliation and recovery fallback for:
 *
 * - dropped WebSockets
 * - sleeping televisions
 * - suspended browser tabs
 * - temporary network loss
 * - missed or delayed realtime messages
 */
const FALLBACK_REFRESH_MS = 15_000;

/*
 * One queue operation may update several database records and therefore
 * emit several realtime invalidation messages.
 *
 * Debouncing prevents the TV from making unnecessary duplicate requests.
 */
const REALTIME_REFRESH_DEBOUNCE_MS = 120;

export function QueueBoard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [location, setLocation] =
    useState("Northfield");

  const [updatedAt, setUpdatedAt] =
    useState<Date | null>(null);

  const [apiConnected, setApiConnected] =
    useState(true);

  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");

  /*
   * Each API request receives a monotonically increasing sequence.
   *
   * If an older request finishes after a newer one, its response is
   * ignored so stale queue state cannot overwrite the newest snapshot.
   */
  const requestSequence = useRef(0);

  /*
   * Holds the debounce timer used when realtime broadcasts arrive in
   * rapid succession.
   */
  const realtimeRefreshTimer =
    useRef<number | null>(null);

  /*
   * Load the canonical privacy-safe queue snapshot.
   *
   * The TV never subscribes directly to raw queue rows. It receives only
   * a realtime "something changed" signal and then reloads this endpoint.
   */
  const load = useCallback(async () => {
    const requestId =
      ++requestSequence.current;

    try {
      const response = await fetch(
        "/api/queue/display",
        {
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as QueueResponse;

      if (!response.ok || !result.ok) {
        throw new Error(
          "Queue display unavailable",
        );
      }

      /*
       * Ignore stale responses.
       */
      if (
        requestId !== requestSequence.current
      ) {
        return;
      }

      setEntries(result.entries ?? []);

      setLocation(
        result.location ?? "Northfield",
      );

      setUpdatedAt(
        result.generatedAt
          ? new Date(result.generatedAt)
          : new Date(),
      );

      setApiConnected(true);
    } catch (error) {
      console.error(
        "queue-board-load-failed",
        error,
      );

      /*
       * Never blank the television because of a temporary connection
       * problem. Keep the last confirmed state visible.
       */
      if (
        requestId === requestSequence.current
      ) {
        setApiConnected(false);
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const supabase =
      getBrowserSupabase();

    /*
     * React's set-state-in-effect lint rule dislikes invoking a function
     * synchronously here when that function eventually updates component
     * state.
     *
     * Schedule the initial canonical load outside the synchronous effect
     * body instead.
     */
    const initialLoadTimer =
      window.setTimeout(() => {
        if (!disposed) {
          void load();
        }
      }, 0);

    /*
     * Canonical reconciliation fallback.
     *
     * Realtime remains primary. This protects the board if Realtime
     * temporarily disappears.
     */
    const fallbackTimer =
      window.setInterval(() => {
        if (!disposed) {
          void load();
        }
      }, FALLBACK_REFRESH_MS);

    /*
     * Immediately reconcile after the browser detects that the network
     * has returned.
     */
    const refreshAfterReconnect = () => {
      if (!disposed) {
        void load();
      }
    };

    /*
     * Smart televisions and tablets may suspend background tabs.
     * Reload the canonical state when the display becomes active again.
     */
    const refreshAfterVisibility = () => {
      if (
        !disposed &&
        document.visibilityState === "visible"
      ) {
        void load();
      }
    };

    window.addEventListener(
      "online",
      refreshAfterReconnect,
    );

    window.addEventListener(
      "focus",
      refreshAfterReconnect,
    );

    document.addEventListener(
      "visibilitychange",
      refreshAfterVisibility,
    );

    /*
     * If Supabase browser configuration is unavailable, keep the TV
     * operational through the REST reconciliation fallback.
     *
     * Schedule the state transition asynchronously so we do not call
     * setState directly inside the effect body.
     */
    if (!supabase) {
      const fallbackStateTimer =
        window.setTimeout(() => {
          if (!disposed) {
            setRealtimeState("fallback");
          }
        }, 0);

      return () => {
        disposed = true;

        window.clearTimeout(
          initialLoadTimer,
        );

        window.clearTimeout(
          fallbackStateTimer,
        );

        window.clearInterval(
          fallbackTimer,
        );

        window.removeEventListener(
          "online",
          refreshAfterReconnect,
        );

        window.removeEventListener(
          "focus",
          refreshAfterReconnect,
        );

        document.removeEventListener(
          "visibilitychange",
          refreshAfterVisibility,
        );

        if (
          realtimeRefreshTimer.current !==
          null
        ) {
          window.clearTimeout(
            realtimeRefreshTimer.current,
          );

          realtimeRefreshTimer.current =
            null;
        }
      };
    }

    /*
     * Coalesce multiple database broadcasts generated by one operational
     * action into a single canonical API refresh.
     */
    const scheduleRealtimeRefresh = () => {
      if (disposed) {
        return;
      }

      if (
        realtimeRefreshTimer.current !== null
      ) {
        window.clearTimeout(
          realtimeRefreshTimer.current,
        );
      }

      realtimeRefreshTimer.current =
        window.setTimeout(() => {
          realtimeRefreshTimer.current =
            null;

          if (!disposed) {
            void load();
          }
        }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    /*
     * The PostgreSQL trigger installed in migration 018 broadcasts:
     *
     * topic: queue-display:northfield
     * event: queue_changed
     * private: false
     *
     * The payload contains only an invalidation signal. It does not
     * contain client names, phone numbers, emails, notes, payment
     * information, or raw queue rows.
     */
    const channel = supabase
      .channel(
        "queue-display:northfield",
        {
          config: {
            private: false,
          },
        },
      )
      .on(
        "broadcast",
        {
          event: "queue_changed",
        },
        () => {
          if (disposed) {
            return;
          }

          setRealtimeState("live");

          scheduleRealtimeRefresh();
        },
      )
      .subscribe((status) => {
        if (disposed) {
          return;
        }

        /*
         * WebSocket established successfully.
         */
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");

          /*
           * Reconcile immediately after subscription.
           *
           * This eliminates the small race where the database could
           * change between the initial page load and WebSocket setup.
           */
          void load();

          return;
        }

        /*
         * Never blank the TV when Realtime disconnects.
         *
         * Supabase can recover its socket while our REST reconciliation
         * timer continues maintaining canonical state.
         */
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeState("fallback");
        }
      });

    return () => {
      disposed = true;

      window.clearTimeout(
        initialLoadTimer,
      );

      window.clearInterval(
        fallbackTimer,
      );

      window.removeEventListener(
        "online",
        refreshAfterReconnect,
      );

      window.removeEventListener(
        "focus",
        refreshAfterReconnect,
      );

      document.removeEventListener(
        "visibilitychange",
        refreshAfterVisibility,
      );

      if (
        realtimeRefreshTimer.current !== null
      ) {
        window.clearTimeout(
          realtimeRefreshTimer.current,
        );

        realtimeRefreshTimer.current =
          null;
      }

      void supabase.removeChannel(channel);
    };
  }, [load]);

  /*
   * Called, ready, and in-service guests belong in the prominent
   * television "Now serving" section.
   */
  const nowServing = useMemo(
    () =>
      entries.filter((entry) =>
        servingStatuses.has(entry.status),
      ),
    [entries],
  );

  /*
   * Everything else returned by the privacy-safe display API remains
   * in queue order under "Up next".
   */
  const waiting = useMemo(
    () =>
      entries.filter(
        (entry) =>
          !servingStatuses.has(entry.status),
      ),
    [entries],
  );

  /*
   * Shop television fullscreen control.
   */
  async function fullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement
        .requestFullscreen()
        .catch(() => undefined);

      return;
    }

    await document
      .exitFullscreen()
      .catch(() => undefined);
  }

  const connectionLabel =
    !apiConnected
      ? "Reconnecting"
      : realtimeState === "live"
        ? "Live"
        : realtimeState ===
            "connecting"
          ? "Connecting"
          : "Auto-refresh";

  const connectionHealthy =
    apiConnected &&
    realtimeState === "live";

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-6 text-[#f4eee3] sm:px-10 sm:py-8 lg:px-14">
      <header className="flex flex-col gap-5 border-b border-[#c99a3e]/25 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[.32em] text-[#c99a3e]">
            Luxury Barber Lounge ·{" "}
            {location}
          </p>

          <h1 className="font-display mt-3 text-4xl sm:text-6xl lg:text-7xl">
            Who&apos;s next
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#bdb4a7]">
  Live walk-in status. Names appear only when the guest has chosen to share a privacy-safe label.
</p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-12 items-center gap-2 rounded-full border border-white/10 px-4 text-xs uppercase tracking-[.16em]"
            aria-live="polite"
          >
            {connectionHealthy ? (
              <Wifi className="h-4 w-4 text-[#c99a3e]" />
            ) : (
              <WifiOff className="h-4 w-4 text-[#c99a3e]" />
            )}

            {connectionLabel}
          </div>

          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/10"
            aria-label="Refresh queue"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              void fullscreen();
            }}
            className="grid h-12 w-12 place-items-center rounded-full bg-[#c99a3e] text-black"
            aria-label="Full screen"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {!apiConnected ? (
        <div
          className="mt-6 rounded-xl border border-[#c99a3e]/30 bg-[#c99a3e]/5 p-4 text-sm"
          role="status"
        >
          Reconnecting to the live queue.
          The last confirmed display
          remains visible.
        </div>
      ) : realtimeState ===
        "fallback" ? (
        <div
          className="mt-6 rounded-xl border border-[#c99a3e]/20 bg-[#c99a3e]/5 p-4 text-sm text-[#d8cfc1]"
          role="status"
        >
          Live connection is recovering.
          Automatic queue refresh remains
          active.
        </div>
      ) : null}

      <section className="mt-7 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-3xl border border-[#c99a3e]/25 bg-[#111]/95 p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">
            Now serving
          </p>

          {nowServing.length ? (
            <div className="mt-6 grid gap-4">
              {nowServing.map(
                (entry) => (
                  <ServingCard
                    key={`${entry.token}-${entry.barber}-${entry.status}`}
                    entry={entry}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <Scissors className="mx-auto h-8 w-8 text-[#c99a3e]" />

                <h2 className="font-display mt-4 text-3xl">
                  Preparing the next chair
                </h2>

                <p className="mt-2 text-sm text-[#a89f92]">
                  Reception will call the
                  next guest shortly.
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">
                Up next
              </p>

              <h2 className="font-display mt-2 text-3xl sm:text-4xl">
                Waiting guests
              </h2>
            </div>

            <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#bdb4a7]">
              {waiting.length} waiting
            </span>
          </div>

          {waiting.length ? (
            <div className="mt-6 grid gap-3">
              {waiting
                .slice(0, 12)
                .map((entry) => (
                  <div
                    key={`${entry.token}-${entry.position}-${entry.status}`}
                    className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  >
                    <span className="font-display grid h-11 w-11 place-items-center rounded-full bg-[#c99a3e]/10 text-xl text-[#d8aa45]">
                      {entry.position}
                    </span>

                    <div>
                      <p className="text-xl font-semibold">
                        {entry.label}
                      </p>

                      <p className="mt-1 text-sm text-[#a89f92]">
                        Assigned to{" "}
                        {entry.barber}
                      </p>
                    </div>

                    <div className="col-start-2 flex items-center gap-2 text-sm text-[#d8aa45] sm:col-start-auto">
                      <Clock3 className="h-4 w-4" />

                      {entry.estimatedWaitMinutes ==
                      null
                        ? "Estimate pending"
                        : `About ${entry.estimatedWaitMinutes} min`}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center text-[#a89f92]">
              No guests are currently
              waiting.
            </div>
          )}
        </article>
      </section>

      <footer className="mt-7 flex flex-col gap-2 border-t border-white/[.07] pt-5 text-xs text-[#81796f] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Please remain in the lounge.
          Wait times are estimates and may
          change with service needs.
        </p>

        <p>
          {updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString(
                [],
                {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                },
              )}`
            : "Connecting…"}
        </p>
      </footer>
    </main>
  );
}

function ServingCard({
  entry,
}: {
  entry: Entry;
}) {
  const heading =
    entry.status === "in_service"
      ? "Now serving"
      : entry.status === "ready"
        ? "Ready"
        : "Please proceed";

  const instruction =
    entry.status === "in_service"
      ? "Service in progress"
      : entry.status === "ready"
        ? "Your chair is ready"
        : "Please proceed when called";

  return (
    <div className="rounded-2xl bg-[#c99a3e] p-5 text-black sm:p-7">
      <p className="text-[10px] uppercase tracking-[.24em]">
        {heading}
      </p>

      <p className="font-display mt-2 text-4xl sm:text-5xl">
        {entry.label}
      </p>

      <p className="mt-3 text-base font-semibold">
        {entry.barber}
      </p>

      <p className="mt-1 text-sm opacity-75">
        {instruction}
      </p>
    </div>
  );
}