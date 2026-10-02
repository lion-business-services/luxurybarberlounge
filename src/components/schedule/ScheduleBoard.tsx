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
  movable,
  onDrop,
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
  movable?: (appointment: BoardAppointment) => boolean;
  onDrop?: (drop: BoardDrop) => void;
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
  const drag = useRef<{ appointment: BoardAppointment; startX: number; startY: number; grabMinutes: number; durationMinutes: number; active: boolean } | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhostState] = useState<Ghost | null>(null);

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

  const cancelDrag = useCallback(() => {
    drag.current = null;
    setGhost(null);
  }, [setGhost]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drag.current) cancelDrag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDrag]);

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>, appointment: BoardAppointment) {
    if (!onDrop || !movable?.(appointment) || event.pointerType === "touch" || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const durationMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
    drag.current = { appointment, startX: event.clientX, startY: event.clientY, grabMinutes: (event.clientY - rect.top) / PX_PER_MINUTE, durationMinutes, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (!current.active) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
      current.active = true;
    }
    event.preventDefault();
    updateGhost(event.clientX, event.clientY);
  }

  function pointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!current?.active) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const dropped = ghostRef.current;
    setGhost(null);
    if (!dropped || !onDrop) return;
    const unchanged = dropped.barberId === current.appointment.barber_profile_id && dropped.startMs === new Date(current.appointment.starts_at).getTime();
    if (unchanged) return;
    onDrop({ appointment: current.appointment, barberId: dropped.barberId, date: dropped.date, startMs: dropped.startMs, result: dropped.result });
  }

  if (!columns.length) {
    return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">No barbers to show.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-ink-line)] bg-[#0a0a0a]">
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
                  const occupancy = appointmentOccupancy(item, facts.nowMs);
                  if (!occupancy) return null;
                  const box = position(occupancy.startMs, occupancy.endMs, column.date);
                  if (!box) return null;
                  const scheduledEnd = new Date(item.ends_at).getTime();
                  const bufferBox = facts.bufferMinutes > 0 ? position(occupancy.endMs, occupancy.endMs + facts.bufferMinutes * 60_000, column.date) : null;
                  const releasedBox = occupancy.kind === "completed" && occupancy.endMs < scheduledEnd ? position(occupancy.endMs + facts.bufferMinutes * 60_000, scheduledEnd, column.date) : null;
                  const hold = isHoldStatus(item.status);
                  const dragging = ghost?.appointment.id === item.id;
                  const canMove = Boolean(onDrop && movable?.(item));
                  const timeText = `${clock(occupancy.startMs, timeZone)} – ${clock(occupancy.endMs, timeZone)}`;
                  const compact = box.height < 46;
                  return (
                    <div key={item.id}>
                      {releasedBox ? <div className="pointer-events-none absolute inset-x-1 rounded border border-dashed border-emerald-400/30" style={releasedBox} title={`Released early. Scheduled until ${clock(scheduledEnd, timeZone)}.`} /> : null}
                      {bufferBox ? <div className="pointer-events-none absolute inset-x-1" style={{ ...bufferBox, backgroundImage: HATCH_BUFFER }} title={`${facts.bufferMinutes}-minute gap after this appointment`} /> : null}
                      {hold ? (
                        <div className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-[var(--color-brass)]/70 bg-[var(--color-brass)]/[.06] px-2 py-1" style={box} title={`Checkout in progress ${timeText}`}>
                          <p className="truncate text-[9px] uppercase tracking-[.1em] text-[var(--color-brass-light)]">Checkout in progress</p>
                          {!compact ? <p className="truncate text-[10px] text-[var(--color-bone-muted)]">{timeText}{item.hold_expires_at ? ` · held until ${clock(new Date(item.hold_expires_at).getTime(), timeZone)}` : ""}</p> : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { if (!suppressClick.current) onSelect?.(item); }}
                          onPointerDown={(event) => pointerDown(event, item)}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={cancelDrag}
                          aria-label={`${timeText}, ${item.client_name_snapshot ?? "Client"}, ${serviceLine(item)}, ${label(item.status)}`}
                          title={`${timeText} · ${item.client_name_snapshot ?? "Client"} · ${serviceLine(item)}${canMove ? " · drag to move" : ""}`}
                          className={`absolute inset-x-1 overflow-hidden rounded-md border border-l-[3px] border-white/10 px-2 text-left transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brass-light)] ${STATUS_STYLE[item.status] ?? STATUS_STYLE.confirmed} ${selectedId === item.id ? "ring-1 ring-[var(--color-brass-light)]" : ""} ${canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dragging || pendingId === item.id ? "opacity-45" : ""} ${dimmed?.has(item.id) ? "opacity-25" : ""}`}
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
