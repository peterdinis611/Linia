"use client";

import { memo, useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n/provider";
import { transitAgencies } from "@/lib/carriers";
import {
  contrastText,
  formatClockRange,
  formatDuration,
  isTransitMode,
  legColor,
} from "@/lib/format";
import type { Itinerary, Leg, Place } from "@/lib/transit/types";
import { alertsFromItinerary } from "../lib/alerts";
import { itineraryIsLive, legPhase } from "../lib/progress";
import {
  departureKey,
  ticketFault,
  ticketTightTransfer,
  ticketTrackChange,
  waitToDepartSeconds,
  walkNotes,
} from "../lib/ticket-notes";
import { itineraryKey } from "../lib/share";
import { watchKey } from "../lib/trip-watch";
import { AlertStrip } from "./AlertStrip";
import { HoldStamp } from "./HoldStamp";
import { ItineraryDetail } from "./ItineraryDetail";
import { LeavesSoon } from "./LeavesSoon";
import { TightFault } from "./TightFault";
import { WatchStamp } from "./WatchStamp";

type ItineraryListProps = {
  itineraries: Itinerary[];
  selectedIndex: number;
  lastOfDayKey?: string | null;
  watchingKey?: string | null;
  watchDenied?: boolean;
  onWatch?: (itinerary: Itinerary) => void;
  heldKey?: string | null;
  onHold?: (itinerary: Itinerary) => void;
  onSelect: (index: number) => void;
  /** When true, stamp the stop-by-stop sheet under the selected ticket. */
  showDetail?: boolean;
  onOpenStation?: (place: Place) => void;
};

export function ItineraryList({
  itineraries,
  selectedIndex,
  lastOfDayKey = null,
  watchingKey = null,
  watchDenied = false,
  onWatch,
  heldKey = null,
  onHold,
  onSelect,
  showDetail = false,
  onOpenStation,
}: ItineraryListProps) {
  const { t } = useI18n();
  return (
    <ul
      className="space-y-3"
      role="listbox"
      aria-label={t("results.departures")}
    >
      {itineraries.map((itinerary, index) => (
        <ItineraryTicket
          key={`${itinerary.startTime}-${itinerary.endTime}-${index}`}
          itinerary={itinerary}
          index={index}
          selected={index === selectedIndex}
          lastOfDayKey={lastOfDayKey}
          watchingKey={watchingKey}
          watchDenied={watchDenied}
          heldKey={heldKey}
          onWatch={onWatch}
          onHold={onHold}
          onSelect={onSelect}
          detail={
            showDetail && index === selectedIndex ? (
              <ItineraryDetail
                itinerary={itinerary}
                onOpenStation={onOpenStation}
              />
            ) : null
          }
        />
      ))}
    </ul>
  );
}

type TicketProps = {
  itinerary: Itinerary;
  index: number;
  selected: boolean;
  lastOfDayKey: string | null;
  watchingKey: string | null;
  watchDenied: boolean;
  heldKey: string | null;
  onWatch?: (itinerary: Itinerary) => void;
  onHold?: (itinerary: Itinerary) => void;
  onSelect: (index: number) => void;
  detail?: ReactNode;
};

const ItineraryTicket = memo(function ItineraryTicket({
  itinerary,
  index,
  selected,
  lastOfDayKey,
  watchingKey,
  watchDenied,
  heldKey,
  onWatch,
  onHold,
  onSelect,
  detail = null,
}: TicketProps) {
  const { locale, t, tp } = useI18n();
  const detailRef = useRef<HTMLDivElement>(null);
  const transitLegs = itinerary.legs.filter((leg) => isTransitMode(leg.mode));
  const fault = ticketFault(itinerary);
  const track = ticketTrackChange(itinerary);
  const tight = ticketTightTransfer(itinerary);
  const walks = walkNotes(itinerary);
  const carriers = transitAgencies(itinerary);
  const alerts = alertsFromItinerary(itinerary);
  const live = itineraryIsLive(itinerary);
  const lastToday = Boolean(
    lastOfDayKey && departureKey(itinerary) === lastOfDayKey,
  );
  const leaving =
    selected &&
    !fault.cancelled &&
    waitToDepartSeconds(itinerary.startTime) != null;

  useEffect(() => {
    if (!selected || !detail) return;
    const node = detailRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [selected, detail, itinerary.startTime]);

  return (
    <li role="none" className="ticket-row">
      <button
        type="button"
        role="option"
        onClick={() => onSelect(index)}
        data-selected={selected}
        data-fault={
          fault.cancelled ||
          fault.delayMinutes != null ||
          Boolean(track) ||
          Boolean(tight)
        }
        aria-selected={selected}
        className="ticket w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[0.95rem] font-medium tracking-tight">
            {formatClockRange(itinerary.startTime, itinerary.endTime, locale)}
          </p>
          <p className="font-display text-lg text-signal">
            {formatDuration(itinerary.duration, t)}
          </p>
        </div>
        <p className="mt-1 text-xs tracking-wide text-ink-muted">
          {itinerary.transfers === 0
            ? t("results.direct")
            : tp("transfers", itinerary.transfers)}
          {live ? ` · ${t("results.onTheLine")}` : ""}
          {carriers.length > 0 ? ` · ${carriers.join(" · ")}` : ""}
        </p>
        {walks.length > 0 ? (
          <p className="ticket-walk" data-testid="ticket-walk">
            {walks
              .map((note) =>
                note.kind === "access" && note.name
                  ? t("results.walkTo", {
                      time: formatDuration(note.seconds, t),
                      name: note.name,
                    })
                  : t("results.walkTransfer", {
                      time: formatDuration(note.seconds, t),
                    }),
              )
              .join(" · ")}
          </p>
        ) : null}
        <div className="spine mt-3" aria-hidden="true">
          {itinerary.legs.map((leg, legIndex) => (
            <span
              key={`${leg.startTime}-${legIndex}`}
              data-progress={legPhase(leg)}
              style={{
                flexGrow: Math.max(leg.duration, 60),
                background: legColor(leg),
              }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(transitLegs.length > 0
            ? transitLegs
            : itinerary.legs.slice(0, 4)
          ).map((leg, legIndex) => (
            <ModeChip key={`${leg.startTime}-${legIndex}`} leg={leg} />
          ))}
        </div>
        {fault.cancelled ||
        fault.delayMinutes != null ||
        lastToday ||
        track ||
        tight ||
        leaving ? (
          <div className="ticket-marks">
            {fault.cancelled ? (
              <span className="ticket-fault" data-testid="ticket-cancelled">
                {t("detail.cancelled")}
              </span>
            ) : null}
            {fault.delayMinutes != null ? (
              <span className="ticket-fault" data-testid="ticket-delayed">
                {t("detail.delayLate", { minutes: fault.delayMinutes })}
              </span>
            ) : null}
            {track ? (
              <span className="ticket-fault" data-testid="ticket-track">
                {t("detail.trackChange", {
                  track: track.track,
                  was: track.was,
                })}
              </span>
            ) : null}
            {tight ? (
              <TightFault transfer={tight} testId="ticket-tight" />
            ) : null}
            {lastToday ? (
              <span className="ticket-last" data-testid="ticket-last">
                {t("results.lastOnBoard")}
              </span>
            ) : null}
            {leaving ? (
              <LeavesSoon
                startTime={itinerary.startTime}
                cancelled={fault.cancelled}
              />
            ) : null}
          </div>
        ) : null}
        {alerts.length > 0 ? (
          <div className="mt-2">
            <AlertStrip alerts={alerts} compact />
          </div>
        ) : null}
      </button>
      {selected && onWatch ? (
        <WatchStamp
          watching={watchingKey === watchKey(itinerary)}
          denied={watchDenied}
          onToggle={() => onWatch(itinerary)}
        />
      ) : null}
      {selected && onHold ? (
        <HoldStamp
          holding={heldKey === itineraryKey(itinerary)}
          onToggle={() => onHold(itinerary)}
        />
      ) : null}
      {detail ? (
        <div ref={detailRef} className="ticket-detail" data-testid="ticket-detail">
          {detail}
        </div>
      ) : null}
    </li>
  );
});

function ModeChip({ leg }: { leg: Leg }) {
  const { t } = useI18n();
  const background = legColor(leg);
  const label = isTransitMode(leg.mode)
    ? leg.displayName ||
      leg.routeShortName ||
      leg.routeLongName ||
      t(`modes.${leg.mode}`)
    : t(`modes.${leg.mode}`);
  return (
    <span
      className="px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
      style={{ background, color: contrastText(background) }}
    >
      {label}
    </span>
  );
}
