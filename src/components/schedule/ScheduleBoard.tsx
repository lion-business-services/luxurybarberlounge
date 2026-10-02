"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  barberDayModel,
  clipToDay,
  instantForLocalMinute,
  localMinuteOfDay,
  previewMove,
  snapMinute,
  visibleRange,
  type CalendarAppointmentFact,
  type CalendarFacts,
} from "@/lib/booking/calendar-model";
import { appointmentOccupancy, isHoldStatus } from "@/lib/booking/rules";
import { rejectionMessage, type PlacementResult } from "@/lib/booking/slots";
import { dateInZone } from "@/lib/booking/timezone";

/**
 * Timeline calendar shared by the Admin Portal and the Barber Portal.
 *
 * Every block on it comes from the booking engine's own intervals
 * (calendar-model.ts), so the picture and the booking rules cannot disagree:
 *
 *   lighter panel ........ the barber's saved working hours (open time)
 *   hatched background ... outside working hours
 *   red hatch ............ approved unavailable time
 *   grey hatch ........... scheduled break
 *   dashed brass ......... a client is paying right now (checkout hold)
 *   thin strip ........... the gap required after each appointment
 *   card ................. an appointment
 *
 * Dragging is a mouse and pen enhancement. Touch and keyboard users move an
 * appointment from its details panel, which runs the same validation.
 *
 * A card can be dropped on any column, so when the columns are days it moves
 * to another day. While a card is carried, the page scrolls by itself near the
 * top and bottom of the screen, and holding the card on the left or right
 * edge asks the parent for the previous or next set of days (onPage), so an
 * appointment can be taken to any date without letting go.
 */

export type BoardAppointment = CalendarAppointmentFact & {
  client_name_snapshot: string | null;
  service_name_snapshot: string | null;
  public_reference?: string | null;
  booking_kind?: string | null;
  party_size?: number | null;
};

export type BoardColumn = {
  key: string;
  barberId: string;
  date: string;
  title: string;
  subtitle?: string;
};

export type BoardDrop = {
  appointment: BoardAppointment;
  barberId: string;
  date: string;
  startMs: number;
  result: PlacementResult;
};

export type BoardPageLabels = { previous: string; next: string };

type Ghost = {
  columnKey: string;
  barberId: string;
  date: string;
  startMs: number;
  startMinute: number;
  durationMinutes: number;
  result: PlacementResult;
  appointment: BoardAppointment;
};

const PX_PER_MINUTE = 1.8;
const GUTTER_PX = 58;
/** The left zone that changes the visible days: the hour labels plus a sliver. */
const EDGE_LEFT_PX = GUTTER_PX + 20;
/** The right zone that changes the visible days. */
const EDGE_RIGHT_PX = 36;
/** Sideways travel before the edges react, so a straight up or down move never changes the days. */
const EDGE_ARM_PX = 24;
/** Distance from the top or bottom of the screen where the page starts to scroll. */
const SCROLL_ZONE_PX = 72;
/** How long a card must rest on an edge before the days change. */
const EDGE_DWELL_MS = 650;
/** If the new days never arrive, the edge becomes usable again after this. */
const PAGE_TIMEOUT_MS = 5000;

type DragState = {
  appointment: BoardAppointment;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  grabMinutes: number;
  durationMinutes: number;
  active: boolean;
  /** True once the card has been carried sideways on purpose. */
  armed: boolean;
};

/** The nearest ancestor that scrolls vertically, or the page itself. */
function verticalScroller(element: HTMLElement | null): HTMLElement {
  let node = element?.parentElement ?? null;
  while (node && node !== document.body) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

/** Scroll speed in pixels per frame: faster the deeper the pointer is in the zone. */
function scrollSpeed(depth: number, zone: number) {
  return Math.round(4 + 16 * Math.min(1, Math.max(0, depth / zone)));
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-l-[var(--color-brass)] bg-[#1d1810] text-[var(--color-bone)]",
  checked_in: "border-l-[var(--color-brass-light)] bg-[#231c10] text-[var(--color-bone)]",
  assigned: "border-l-[var(--color-brass-light)] bg-[#231c10] text-[var(--color-bone)]",
  in_service: "border-l-emerald-400 bg-[#10201a] text-[var(--color-bone)]",
  completed: "border-l-white/25 bg-[#151515] text-[var(--color-bone-muted)]",
};

function label(value: string | null | undefined) {
  return String(value ?? "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

function hourLabel(minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

function serviceLine(item: BoardAppointment) {
  const service = item.service_name_snapshot ?? "Service";
  return item.booking_kind === "family" && item.party_size ? `${service} · ${item.party_size} people` : service;
}

const HATCH = "repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 6px, transparent 6px 12px)";
const HATCH_RED = "repeating-linear-gradient(135deg, rgba(114,47,55,.55) 0 6px, rgba(114,47,55,.22) 6px 12px)";
const HATCH_GREY = "repeating-linear-gradient(135deg, rgba(184,176,163,.22) 0 6px, rgba(184,176,163,.08) 6px 12px)";
const HATCH_BUFFER = "repeating-linear-gradient(90deg, rgba(184,134,42,.28) 0 4px, transparent 4px 8px)";

export function ScheduleBoard({
  columns,
  facts,
  appointments,
  selectedId,
  pendingId,
  dimmed,
  onSelect,
  onPaidHoldSelect,
  movable,
  onDrop,
  onPage,
  pageLabels,
  snapMinutes = 5,
  emptyLabel = "Not scheduled",
}: {
  columns: BoardColumn[];
  facts: CalendarFacts;
  /** Paid appointments and live holds. Non-blocking rows are ignored. */
  appointments: BoardAppointment[];
  selectedId?: string | null;
  /** The appointment whose move is being saved. */
  pendingId?: string | null;
  /** Appointments that do not match the current search. */
  dimmed?: Set<string>;
  onSelect?: (appointment: BoardAppointment) => void;
  /** A checkout whose payment was received but which is not confirmed yet. */
  onPaidHoldSelect?: (appointment: BoardAppointment) => void;
  movable?: (appointment: BoardAppointment) => boolean;
  onDrop?: (drop: BoardDrop) => void;
  /** Show the previous (-1) or next (1) set of days while a card is carried. */
  onPage?: (direction: -1 | 1) => void;
  pageLabels?: BoardPageLabels;
  snapMinutes?: number;
  emptyLabel?: string;
}) {
  const timeZone = facts.timezone;
  const dates = useMemo(() => [...new Set(columns.map((column) => column.date))], [columns]);
  const range = useMemo(() => visibleRange(facts, dates), [facts, dates]);
  const height = (range.endMinute - range.startMinute) * PX_PER_MINUTE;
  const today = dateInZone(new Date(facts.nowMs), timeZone);
  const nowMinute = localMinuteOfDay(facts.nowMs, timeZone);

  const bodies = useRef(new Map<string, HTMLDivElement>());
  const scroller = useRef<HTMLDivElement | null>(null);
  const chip = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef<number | null>(null);
  const edge = useRef<{ direction: -1 | 1; since: number } | null>(null);
  const pageRequestedAt = useRef<number | null>(null);
  const [ghost, setGhostState] = useState<Ghost | null>(null);
  const [carrying, setCarrying] = useState<{ id: string; text: string } | null>(null);
  const [edgeActive, setEdgeActive] = useState<-1 | 0 | 1>(0);
  const columnsKey = useMemo(() => columns.map((column) => column.key).join("|"), [columns]);

  const setGhost = useCallback((value: Ghost | null) => {
    ghostRef.current = value;
    setGhostState(value);
  }, []);

  const hours = useMemo(() => {
    const marks: number[] = [];
    for (let minute = range.startMinute; minute <= range.endMinute; minute += 60) marks.push(minute);
    return marks;
  }, [range]);

  const position = useCallback(
    (startMs: number, endMs: number, date: string) => {
      const clipped = clipToDay({ startMs, endMs }, date, timeZone, range.startMinute, range.endMinute);
      if (!clipped) return null;
      return { top: (clipped.startMinute - range.startMinute) * PX_PER_MINUTE, height: Math.max(2, (clipped.endMinute - clipped.startMinute) * PX_PER_MINUTE) };
    },
    [range, timeZone],
  );

  const updateGhost = useCallback(
    (clientX: number, clientY: number) => {
      const current = drag.current;
      if (!current) return;
      let target: { column: BoardColumn; rect: DOMRect } | null = null;
      for (const column of columns) {
        const element = bodies.current.get(column.key);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (clientX >= rect.left && clientX < rect.right) {
          target = { column, rect };
          break;
        }
      }
      if (!target) {
        setGhost(null);
        return;
      }
      const raw = range.startMinute + (clientY - target.rect.top) / PX_PER_MINUTE - current.grabMinutes;
      const startMinute = Math.max(range.startMinute, Math.min(range.endMinute - current.durationMinutes, snapMinute(raw, snapMinutes)));
      const startMs = instantForLocalMinute(target.column.date, startMinute, timeZone);
      const result = previewMove(facts, {
        appointmentId: current.appointment.id,
        durationMinutes: current.durationMinutes,
        barberId: target.column.barberId,
        date: target.column.date,
        startMs,
      });
      setGhost({
        columnKey: target.column.key,
        barberId: target.column.barberId,
        date: target.column.date,
        startMs,
        startMinute,
        durationMinutes: current.durationMinutes,
        result,
        appointment: current.appointment,
      });
    },
    [columns, facts, range, setGhost, snapMinutes, timeZone],
  );

  // The window listeners and the animation loop live for the whole drag, even
  // while the days underneath change, so they read the newest props from here.
  const latest = useRef({ updateGhost, onDrop, onPage });
  useEffect(() => {
    latest.current = { updateGhost, onDrop, onPage };
  });

  const placeChip = useCallback((clientX: number, clientY: number) => {
    if (chip.current) chip.current.style.transform = `translate(${Math.round(clientX + 14)}px, ${Math.round(clientY + 16)}px)`;
  }, []);

  const stopLoop = useCallback(() => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
    edge.current = null;
    pageRequestedAt.current = null;
    setEdgeActive(0);
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
    stopLoop();
    setGhost(null);
    setCarrying(null);
  }, [setGhost, stopLoop]);

  // New days arrived (or the columns changed for any other reason): place the
  // preview on them straight away and let the edge be used again.
  useEffect(() => {
    pageRequestedAt.current = null;
    if (edge.current) edge.current = { direction: edge.current.direction, since: performance.now() };
    const current = drag.current;
    if (current?.active) latest.current.updateGhost(current.lastX, current.lastY);
  }, [columnsKey, facts]);

  useEffect(() => {
    // One step of the carry loop: scroll the page near the top and bottom of the
    // screen, scroll the columns sideways, and change the days at the far edges.
    function tick() {
      frame.current = null;
      const current = drag.current;
      const container = scroller.current;
      if (!current?.active || !container) return;
      let moved = false;

      const vertical = verticalScroller(container);
      const page = vertical === document.scrollingElement || vertical === document.documentElement;
      const top = page ? 0 : vertical.getBoundingClientRect().top;
      const bottom = page ? window.innerHeight : vertical.getBoundingClientRect().bottom;
      if (current.lastY < top + SCROLL_ZONE_PX && vertical.scrollTop > 0) {
        vertical.scrollTop -= scrollSpeed(top + SCROLL_ZONE_PX - current.lastY, SCROLL_ZONE_PX);
        moved = true;
      } else if (current.lastY > bottom - SCROLL_ZONE_PX && vertical.scrollTop < vertical.scrollHeight - vertical.clientHeight - 1) {
        vertical.scrollTop += scrollSpeed(current.lastY - (bottom - SCROLL_ZONE_PX), SCROLL_ZONE_PX);
        moved = true;
      }

      const rect = container.getBoundingClientRect();
      const leftZone = rect.left + EDGE_LEFT_PX;
      const rightZone = rect.right - EDGE_RIGHT_PX;
      const maxLeft = container.scrollWidth - container.clientWidth;
      let direction: -1 | 0 | 1 = 0;
      if (!current.armed) {
        direction = 0;
      } else if (current.lastX < leftZone) {
        if (container.scrollLeft > 0) {
          container.scrollLeft -= scrollSpeed(leftZone - current.lastX, EDGE_LEFT_PX);
          moved = true;
        } else direction = -1;
      } else if (current.lastX > rightZone) {
        if (container.scrollLeft < maxLeft - 1) {
          container.scrollLeft += scrollSpeed(current.lastX - rightZone, EDGE_RIGHT_PX);
          moved = true;
        } else direction = 1;
      }

      const now = performance.now();
      if (pageRequestedAt.current !== null && now - pageRequestedAt.current > PAGE_TIMEOUT_MS) pageRequestedAt.current = null;
      const pager = latest.current.onPage;
      if (!pager || direction === 0) {
        if (edge.current) {
          edge.current = null;
          setEdgeActive(0);
        }
      } else if (pageRequestedAt.current === null) {
        if (edge.current?.direction !== direction) {
          edge.current = { direction, since: now };
          setEdgeActive(direction);
        } else if (now - edge.current.since >= EDGE_DWELL_MS) {
          // Wait for the new days before the edge can be used again.
          pageRequestedAt.current = now;
          edge.current = { direction, since: now };
          pager(direction);
        }
      }

      if (moved) latest.current.updateGhost(current.lastX, current.lastY);
      frame.current = window.requestAnimationFrame(tick);
    }

    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (!current || event.pointerId !== current.pointerId) return;
      // The button was released somewhere the page could not see.
      if (event.buttons === 0) {
        endDrag();
        return;
      }
      current.lastX = event.clientX;
      current.lastY = event.clientY;
      if (Math.abs(event.clientX - current.startX) >= EDGE_ARM_PX) current.armed = true;
      if (!current.active) {
        if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
        current.active = true;
        const minutes = current.durationMinutes;
        setCarrying({ id: current.appointment.id, text: `${current.appointment.client_name_snapshot ?? "Client"} · ${minutes} min` });
        if (frame.current === null) frame.current = window.requestAnimationFrame(tick);
      }
      event.preventDefault();
      placeChip(event.clientX, event.clientY);
      latest.current.updateGhost(event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      const current = drag.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const dropped = ghostRef.current;
      endDrag();
      if (!current.active) return;
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      const drop = latest.current.onDrop;
      if (!dropped || !drop) return;
      const unchanged = dropped.barberId === current.appointment.barber_profile_id && dropped.startMs === new Date(current.appointment.starts_at).getTime();
      if (unchanged) return;
      drop({ appointment: current.appointment, barberId: dropped.barberId, date: dropped.date, startMs: dropped.startMs, result: dropped.result });
    };
    const cancel = (event: PointerEvent) => {
      if (drag.current && event.pointerId === drag.current.pointerId) endDrag();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drag.current) endDrag();
    };
    const scrolled = () => {
      const current = drag.current;
      if (current?.active) latest.current.updateGhost(current.lastX, current.lastY);
    };
    const blur = () => {
      if (drag.current) endDrag();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("blur", blur);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [endDrag, placeChip]);

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>, appointment: BoardAppointment) {
    if (!onDrop || !movable?.(appointment) || event.pointerType === "touch" || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const durationMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
    drag.current = {
      appointment,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      grabMinutes: (event.clientY - rect.top) / PX_PER_MINUTE,
      durationMinutes,
      active: false,
      armed: false,
    };
    // Keeps the drag alive when the pointer leaves the window. If the card is
    // replaced by another set of days, the window listeners carry on.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  if (!columns.length) {
    return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">No barbers to show.</div>;
  }

  const pageable = Boolean(carrying && onPage);

  return (
    <div className="relative">
      {carrying ? (
        <div ref={chip} className="pointer-events-none fixed left-0 top-0 z-[90] max-w-[220px] truncate rounded-full border border-[var(--color-brass)]/50 bg-[#0b0b0b] px-3 py-1 text-[10px] text-[var(--color-bone)] shadow-xl" style={{ transform: "translate(-999px, -999px)" }} aria-hidden="true">
          {carrying.text}
        </div>
      ) : null}
      {pageable ? (
        <>
          <div className={`pointer-events-none absolute bottom-0 top-0 z-30 flex items-start justify-center rounded-l-2xl border-r transition-colors ${edgeActive === -1 ? "border-[var(--color-brass)] bg-[var(--color-brass)]/30" : "border-[var(--color-brass)]/30 bg-[var(--color-brass)]/10"}`} style={{ left: 0, width: EDGE_LEFT_PX }} aria-hidden="true">
            <span className="sticky top-28 mt-16 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass-light)] [writing-mode:vertical-rl] rotate-180">‹ {pageLabels?.previous ?? "Earlier"}</span>
          </div>
          <div className={`pointer-events-none absolute bottom-0 right-0 top-0 z-30 flex items-start justify-center rounded-r-2xl border-l transition-colors ${edgeActive === 1 ? "border-[var(--color-brass)] bg-[var(--color-brass)]/30" : "border-[var(--color-brass)]/30 bg-[var(--color-brass)]/10"}`} style={{ width: EDGE_RIGHT_PX }} aria-hidden="true">
            <span className="sticky top-28 mt-16 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass-light)] [writing-mode:vertical-rl]">{pageLabels?.next ?? "Later"} ›</span>
          </div>
        </>
      ) : null}
    <div ref={scroller} className="overflow-x-auto rounded-2xl border border-[var(--color-ink-line)] bg-[#0a0a0a]">
      <div className="select-none" style={{ minWidth: GUTTER_PX + columns.length * 168 }}>
        <div className="sticky top-0 z-20 grid border-b border-[var(--color-ink-line)] bg-[#0d0d0d]" style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(${columns.length}, minmax(168px, 1fr))` }}>
          <div className="p-3 text-[8px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">ET</div>
          {columns.map((column) => (
            <div key={column.key} className={`border-l border-[var(--color-ink-line)] px-3 py-3 ${column.date === today ? "bg-[var(--color-brass)]/[.06]" : ""}`}>
              <p className="truncate text-sm font-medium">{column.title}</p>
              {column.subtitle ? <p className="mt-0.5 truncate text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{column.subtitle}</p> : null}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(${columns.length}, minmax(168px, 1fr))` }}>
          <div className="relative" style={{ height }} aria-hidden="true">
            {hours.map((minute) => (
              <span key={minute} className="absolute right-2 -translate-y-1/2 text-[9px] tabular-nums text-[var(--color-bone-muted)]" style={{ top: Math.min(height - 6, Math.max(6, (minute - range.startMinute) * PX_PER_MINUTE)) }}>
                {hourLabel(minute)}
              </span>
            ))}
          </div>

          {columns.map((column) => {
            const model = barberDayModel(facts, column.barberId, column.date);
            const cards = appointments.filter((item) => item.barber_profile_id === column.barberId);
            const columnGhost = ghost?.columnKey === column.key ? ghost : null;
            return (
              <div
                key={column.key}
                ref={(element) => {
                  if (element) bodies.current.set(column.key, element);
                  else bodies.current.delete(column.key);
                }}
                className="relative border-l border-[var(--color-ink-line)]"
                style={{ height, backgroundImage: HATCH }}
              >
                {model.windows.map((window) => {
                  const box = position(window.startMs, window.endMs, column.date);
                  return box ? <div key={`w-${window.startMs}`} className="absolute inset-x-0 bg-[#12110f]" style={box} title={`Working hours ${clock(window.startMs, timeZone)} to ${clock(window.endMs, timeZone)}`} /> : null;
                })}

                {!model.windows.length ? <p className="absolute inset-x-0 top-3 text-center text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{emptyLabel}</p> : null}

                {hours.map((minute) => (
                  <div key={minute} className="pointer-events-none absolute inset-x-0 border-t border-white/[.06]" style={{ top: (minute - range.startMinute) * PX_PER_MINUTE }} />
                ))}

                {model.hardBlocks.map((block) => {
                  const box = position(block.startMs, block.endMs, column.date);
                  if (!box) return null;
                  const timeOff = block.kind === "time_off";
                  return (
                    <div key={`${block.kind}-${block.id}`} className={`absolute inset-x-0 overflow-hidden border-y ${timeOff ? "border-[var(--color-oxblood)]" : "border-white/10"}`} style={{ ...box, backgroundImage: timeOff ? HATCH_RED : HATCH_GREY }} title={`${timeOff ? "Unavailable" : "Break"} ${clock(block.startMs, timeZone)} to ${clock(block.endMs, timeZone)}`}>
                      {box.height >= 18 ? <p className="px-2 pt-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-bone)]">{timeOff ? "Unavailable" : "Break"} · {clock(block.startMs, timeZone)}–{clock(block.endMs, timeZone)}</p> : null}
                    </div>
                  );
                })}

                {cards.map((item) => {
                  const scheduledStart = new Date(item.starts_at).getTime();
                  const scheduledEnd = new Date(item.ends_at).getTime();
                  const live = appointmentOccupancy(item, facts.nowMs);
                  // An appointment finished before it was due to start holds no
                  // time, but it stays visible in its scheduled place.
                  const finishedBeforeStart = !live && item.status === "completed";
                  if (!live && !finishedBeforeStart) return null;
                  const occupancy = live ?? { kind: "completed" as const, startMs: scheduledStart, endMs: scheduledEnd };
                  const box = position(occupancy.startMs, occupancy.endMs, column.date);
                  if (!box) return null;
                  const bufferBox = !finishedBeforeStart && facts.bufferMinutes > 0 ? position(occupancy.endMs, occupancy.endMs + facts.bufferMinutes * 60_000, column.date) : null;
                  const releasedBox = !finishedBeforeStart && occupancy.kind === "completed" && occupancy.endMs < scheduledEnd ? position(occupancy.endMs + facts.bufferMinutes * 60_000, scheduledEnd, column.date) : null;
                  const hold = isHoldStatus(item.status);
                  const paymentReceived = hold && (item.deposit_status === "paid" || !item.hold_expires_at);
                  const dragging = carrying?.id === item.id;
                  const canMove = Boolean(onDrop && movable?.(item));
                  const timeText = `${clock(occupancy.startMs, timeZone)} – ${clock(occupancy.endMs, timeZone)}${finishedBeforeStart ? " (finished early, time released)" : ""}`;
                  const compact = box.height < 46;
                  return (
                    <div key={item.id}>
                      {releasedBox ? <div className="pointer-events-none absolute inset-x-1 rounded border border-dashed border-emerald-400/30" style={releasedBox} title={`Released early. Scheduled until ${clock(scheduledEnd, timeZone)}.`} /> : null}
                      {bufferBox ? <div className="pointer-events-none absolute inset-x-1" style={{ ...bufferBox, backgroundImage: HATCH_BUFFER }} title={`${facts.bufferMinutes}-minute gap after this appointment`} /> : null}
                      {hold && paymentReceived && onPaidHoldSelect ? (
                        <button type="button" onClick={() => onPaidHoldSelect(item)} className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-amber-300/80 bg-amber-300/10 px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brass-light)]" style={{ ...box, zIndex: 5 }} aria-label={`Payment received, not confirmed yet, ${timeText}. Select to confirm.`}>
                          <span className="block truncate text-[9px] uppercase tracking-[.1em] text-amber-200">Payment received · select to confirm</span>
                          {!compact ? <span className="block truncate text-[10px] text-[var(--color-bone-muted)]">{timeText}</span> : null}
                        </button>
                      ) : hold ? (
                        <div className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-[var(--color-brass)]/70 bg-[var(--color-brass)]/[.06] px-2 py-1" style={box} title={`Checkout in progress ${timeText}`}>
                          <p className="truncate text-[9px] uppercase tracking-[.1em] text-[var(--color-brass-light)]">{paymentReceived ? "Payment received · confirming" : "Checkout in progress"}</p>
                          {!compact ? <p className="truncate text-[10px] text-[var(--color-bone-muted)]">{timeText}{!paymentReceived && item.hold_expires_at ? ` · held until ${clock(new Date(item.hold_expires_at).getTime(), timeZone)}` : ""}</p> : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { if (!suppressClick.current) onSelect?.(item); }}
                          onPointerDown={(event) => pointerDown(event, item)}
                          aria-label={`${timeText}, ${item.client_name_snapshot ?? "Client"}, ${serviceLine(item)}, ${label(item.status)}`}
                          title={`${timeText} · ${item.client_name_snapshot ?? "Client"} · ${serviceLine(item)}${canMove ? " · drag to move" : ""}`}
                          className={`absolute inset-x-1 overflow-hidden rounded-md border border-l-[3px] border-white/10 px-2 text-left transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brass-light)] ${STATUS_STYLE[item.status] ?? STATUS_STYLE.confirmed} ${finishedBeforeStart ? "border-dashed opacity-70" : ""} ${selectedId === item.id ? "ring-1 ring-[var(--color-brass-light)]" : ""} ${canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dragging || pendingId === item.id ? "opacity-45" : ""} ${dimmed?.has(item.id) ? "opacity-25" : ""}`}
                          style={{ ...box, paddingTop: compact ? 2 : 5, zIndex: 5 }}
                        >
                          {compact ? (
                            <p className="truncate text-[10px] leading-4"><span className="tabular-nums">{clock(occupancy.startMs, timeZone)}</span> · {item.client_name_snapshot ?? "Client"}</p>
                          ) : (
                            <>
                              <p className="truncate text-[10px] tabular-nums leading-4 text-[var(--color-brass-light)]">{timeText}</p>
                              <p className="truncate text-xs font-medium leading-4">{item.client_name_snapshot ?? "Client"}</p>
                              {box.height >= 62 ? <p className="truncate text-[10px] leading-4 text-[var(--color-bone-muted)]">{serviceLine(item)}</p> : null}
                              {box.height >= 82 ? <p className="mt-0.5 truncate text-[8px] uppercase tracking-[.1em] text-[var(--color-bone-muted)]">{pendingId === item.id ? "Saving…" : label(item.status)}</p> : null}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}

                {column.date === today && nowMinute >= range.startMinute && nowMinute <= range.endMinute ? (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-[var(--color-brass-light)]" style={{ top: (nowMinute - range.startMinute) * PX_PER_MINUTE }} aria-hidden="true">
                    <span className="absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-[var(--color-brass-light)]" />
                  </div>
                ) : null}

                {columnGhost ? (
                  <div
                    className={`pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 px-2 py-1 ${columnGhost.result.ok ? "border-emerald-400 bg-emerald-400/15" : "border-red-400 bg-red-500/15"}`}
                    style={{ top: (columnGhost.startMinute - range.startMinute) * PX_PER_MINUTE, height: Math.max(22, columnGhost.durationMinutes * PX_PER_MINUTE) }}
                    role="status"
                  >
                    <p className="text-[10px] font-medium tabular-nums">{clock(columnGhost.startMs, timeZone)} – {clock(columnGhost.startMs + columnGhost.durationMinutes * 60_000, timeZone)}</p>
                    <p className="text-[10px] leading-4">{columnGhost.result.ok ? "Release to move here" : rejectionMessage(columnGhost.result.reason)}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}

export function ScheduleLegend({ bufferMinutes }: { bufferMinutes: number }) {
  const item = (swatch: React.ReactNode, text: string) => (
    <span className="inline-flex items-center gap-2 text-[10px] text-[var(--color-bone-muted)]">{swatch}{text}</span>
  );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Calendar legend">
      {item(<span className="h-3 w-5 rounded-sm border border-white/10 bg-[#12110f]" />, "Open working time")}
      {item(<span className="h-3 w-5 rounded-sm border border-white/10" style={{ backgroundImage: HATCH }} />, "Outside working hours")}
      {item(<span className="h-3 w-5 rounded-sm border border-l-[3px] border-white/10 border-l-[var(--color-brass)] bg-[#1d1810]" />, "Appointment")}
      {item(<span className="h-3 w-5 rounded-sm border border-dashed border-[var(--color-brass)]/70" />, "Checkout in progress")}
      {item(<span className="h-3 w-5 rounded-sm border border-[var(--color-oxblood)]" style={{ backgroundImage: HATCH_RED }} />, "Unavailable")}
      {item(<span className="h-3 w-5 rounded-sm border border-white/10" style={{ backgroundImage: HATCH_GREY }} />, "Break")}
      {item(<span className="h-1.5 w-5" style={{ backgroundImage: HATCH_BUFFER }} />, `${bufferMinutes}-minute gap`)}
    </div>
  );
}
