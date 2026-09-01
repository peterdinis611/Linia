"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import {
  arrivalDelayMinutes,
  contrastText,
  delayMinutes,
  formatDistance,
  formatDuration,
  formatTime,
  isTransitMode,
  legColor,
  legName,
  stopArrival,
  stopDeparture,
} from "@/lib/format";
import {
  stopsBetween,
  type Itinerary,
  type Leg,
  type Place,
} from "@/lib/transit/types";
import { fetchTrip } from "@/lib/transit/queries";
import { alertsFromItinerary, uniqueAlerts } from "../lib/alerts";
import { currentStopIndex, itineraryIsLive, legPhase } from "../lib/progress";
import {
  tightStampForLeg,
  tightTransfers,
  trackChange,
  ticketFault,
} from "../lib/ticket-notes";
import { AlertStrip } from "./AlertStrip";
import { LeavesSoon } from "./LeavesSoon";
import { TightFault } from "./TightFault";
import { TrackFault } from "./TrackFault";

type ItineraryDetailProps = {
  itinerary: Itinerary;
  onOpenStation?: (place: Place) => void;
};

export function ItineraryDetail({ itinerary, onOpenStation }: ItineraryDetailProps) {
  const { t, tp } = useI18n();
  const now = useNow(itineraryIsLive(itinerary));
  const tights = tightTransfers(itinerary);
  const cancelled = ticketFault(itinerary).cancelled;

  return (
    <section className="journey-sheet">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-rule pb-3">
        <div>
          <p className="kicker">{t("detail.kicker")}</p>
          <h2 className="font-display mt-1 text-xl italic">
            {t("detail.title")}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LeavesSoon
            startTime={itinerary.startTime}
            cancelled={cancelled}
            testId="detail-soon"
          />
          <p className="font-mono text-[11px] tracking-wide text-ink-muted">
            {formatDuration(itinerary.duration, t)} ·{" "}
            {itinerary.transfers === 0
              ? t("detail.direct")
              : tp("transfersShort", itinerary.transfers)}
          </p>
        </div>
      </div>
      <AlertStrip alerts={alertsFromItinerary(itinerary)} />
      <ol>
        {itinerary.legs.map((leg, index) => (
          <LegBlock
            key={`${leg.startTime}-${index}`}
            leg={leg}
            isFirst={index === 0}
            isLast={index === itinerary.legs.length - 1}
            prevToStopId={itinerary.legs[index - 1]?.to.stopId}
            now={now}
            tight={tightStampForLeg(leg, index, itinerary.legs, tights)}
            onOpenStation={onOpenStation}
          />
        ))}
      </ol>
    </section>
  );
}

function useNow(live: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [live]);
  return now;
}

function LegBlock({
  leg,
  isFirst,
  isLast,
  prevToStopId,
  now,
  tight,
  onOpenStation,
}: {
  leg: Leg;
  isFirst: boolean;
  isLast: boolean;
  prevToStopId?: string;
  now: number;
  tight: ReturnType<typeof tightStampForLeg>;
  onOpenStation?: (place: Place) => void;
}) {
  const { locale, t, tp } = useI18n();
  const color = legColor(leg);
  const transit = isTransitMode(leg.mode);
  const phase = legPhase(leg, now);
  const {
    stops: intermediates,
    loading: loadingStops,
    failed: failedStops,
    retry: retryStops,
  } = useIntermediateStops(leg, true);
  const delay = delayMinutes(leg);
  const arriveDelay = arrivalDelayMinutes(leg);
  const liveStop = phase === "current" ? currentStopIndex(intermediates, now) : -1;

  if (!transit) {
    return (
      <li className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3" data-progress={phase}>
        <div className="py-1 text-right font-mono text-[11px] tabular-nums text-ink-muted">
          {formatTime(leg.startTime, locale)}
        </div>
        <div className="flex flex-col items-center">
          <span
            className="mt-1.5 h-2 w-2 rounded-full ring-2 ring-paper-raised"
            style={{ background: color }}
          />
          <span
            className="w-px flex-1 border-l border-dashed"
            style={{ borderColor: color }}
          />
        </div>
        <div className={isLast ? "pb-2" : "pb-5"}>
          <p className="text-sm font-semibold tracking-tight">
            <StationName place={leg.from} onOpenStation={onOpenStation} />
          </p>
          <StationBoardStamp
            place={leg.from}
            kind={isFirst ? "from" : "change"}
            onOpenStation={onOpenStation}
          />
          <p className="mt-1 text-xs text-ink-muted">
            {phase === "current" ? `${t("detail.now")} · ` : ""}
            {t(`modes.${leg.mode}`)} · {formatDuration(leg.duration, t)}
            {formatDistance(leg.distance) ? ` · ${formatDistance(leg.distance)}` : ""}
          </p>
          {tight ? (
            <div className="ticket-marks">
              <TightFault transfer={tight} testId="detail-tight" />
            </div>
          ) : null}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-ink-muted">
              {formatTime(leg.endTime, locale)}
            </span>
            <div>
              <p className="text-sm text-ink-soft">
                <StationName place={leg.to} onOpenStation={onOpenStation} />
              </p>
              <StationBoardStamp
                place={leg.to}
                kind={isLast ? "to" : isFirst ? "from" : "change"}
                onOpenStation={onOpenStation}
              />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li data-progress={phase}>
      <div className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3">
        <div className="py-1 text-right font-mono text-[11px] tabular-nums text-ink-soft">
          {formatTime(leg.startTime, locale)}
        </div>
        <div className="flex flex-col items-center">
          <span
            className="mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-paper-raised"
            style={{ background: color }}
          />
          <span className="w-[3px] flex-1" style={{ background: color }} />
        </div>
        <div className="pb-3">
          <p className="text-sm font-semibold tracking-tight">
            <StationName place={leg.from} onOpenStation={onOpenStation} />
            <span className="call-kind">{t("detail.departs")}</span>
          </p>
          {leg.from.stopId !== prevToStopId ? (
            <StationBoardStamp
              place={leg.from}
              kind="from"
              onOpenStation={onOpenStation}
            />
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className="px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
              style={{ background: color, color: contrastText(color) }}
            >
              {legName(leg)}
            </span>
            {leg.headsign && (
              <span className="text-xs text-ink-muted">
                {t("detail.toHeadsign", { name: leg.headsign })}
              </span>
            )}
            {delay != null && (
              <DelayLabel minutes={delay} />
            )}
            {leg.cancelled && (
              <span className="text-xs font-semibold text-signal">{t("detail.cancelled")}</span>
            )}
            {phase === "current" ? (
              <span className="now-stamp" data-testid="leg-now">
                {t("detail.now")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {formatDuration(leg.duration, t)}
            {leg.agencyName ? ` · ${leg.agencyName}` : ""}
            {leg.from.track && !trackChange(leg.from)
              ? ` · ${t("detail.platform", { track: leg.from.track })}`
              : ""}
          </p>
          {trackChange(leg.from) ? (
            <div className="ticket-marks">
              <TrackFault place={leg.from} testId="detail-track-from" />
            </div>
          ) : null}
          {tight ? (
            <div className="ticket-marks">
              <TightFault transfer={tight} testId="detail-tight" />
            </div>
          ) : null}
          <AlertStrip alerts={uniqueAlerts([...(leg.alerts ?? []), ...(leg.from.alerts ?? [])])} />
        </div>
      </div>

      {loadingStops && intermediates.length === 0 && (
        <p className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3 text-xs text-ink-muted">
          <span />
          <span className="flex justify-center">
            <span className="w-[3px] min-h-4" style={{ background: color }} />
          </span>
          <span className="py-1">{t("detail.loadingStops")}</span>
        </p>
      )}

      {failedStops && (
        <p className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3 text-xs">
          <span />
          <span className="flex justify-center">
            <span className="w-[3px] min-h-4" style={{ background: color }} />
          </span>
          <span className="flex flex-wrap items-center gap-2 py-1">
            <span className="text-ink-muted">{t("detail.stopsFailed")}</span>
            <button
              type="button"
              className="stamp"
              data-testid="retry-stops"
              onClick={() => retryStops()}
            >
              {t("detail.retryStops")}
            </button>
          </span>
        </p>
      )}

      {intermediates.length > 0 && (
        <details className="group" open>
          <summary className="grid cursor-pointer grid-cols-[3.4rem_14px_1fr] gap-x-3 list-none [&::-webkit-details-marker]:hidden">
            <span />
            <span className="flex flex-col items-center">
              <span className="w-[3px] flex-1" style={{ background: color }} />
            </span>
            <span className="flex items-center gap-1 py-1 text-xs font-medium text-ink-muted">
              <span className="stops-chevron" aria-hidden="true" />
              {tp("stops", intermediates.length)}
            </span>
          </summary>
          <ol data-testid="call-board">
            {intermediates.map((stop, stopIndex) => (
              <IntermediateStop
                key={`${stop.name}-${stop.lat}-${stopIndex}`}
                stop={stop}
                color={color}
                current={stopIndex === liveStop}
                onOpenStation={onOpenStation}
              />
            ))}
          </ol>
        </details>
      )}

      <div className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3">
        <div className="py-1 text-right font-mono text-[11px] tabular-nums text-ink-soft">
          {formatTime(leg.endTime, locale)}
        </div>
        <div className="flex flex-col items-center">
          <span
            className="mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-paper-raised"
            style={{
              background: isLast ? color : "var(--paper-raised)",
              boxShadow: `inset 0 0 0 2px ${color}`,
            }}
          />
          {!isLast && (
            <span className="w-[3px] flex-1" style={{ background: color }} />
          )}
        </div>
        <div className={isLast ? "pb-2" : "pb-6"}>
          <p className="text-sm font-semibold tracking-tight">
            <StationName place={leg.to} onOpenStation={onOpenStation} />
            <span className="call-kind">{t("detail.arrives")}</span>
          </p>
          <StationBoardStamp
            place={leg.to}
            kind={isLast ? "to" : "change"}
            onOpenStation={onOpenStation}
          />
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {leg.to.track && !trackChange(leg.to)
              ? t("detail.platform", { track: leg.to.track })
              : null}
            {trackChange(leg.to) ? (
              <TrackFault place={leg.to} testId="detail-track-to" />
            ) : null}
            {arriveDelay != null && <DelayLabel minutes={arriveDelay} />}
          </p>
        </div>
      </div>
    </li>
  );
}

function useIntermediateStops(
  leg: Leg,
  enabled: boolean,
): {
  stops: Place[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
} {
  const [stops, setStops] = useState<Place[]>(leg.intermediateStops ?? []);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const loadedTrip = useRef<string | null>(null);

  useEffect(() => {
    const existing = leg.intermediateStops ?? [];
    if (existing.length > 0) {
      loadedTrip.current = leg.tripId ?? null;
      setStops(existing);
      setFailed(false);
      setLoading(false);
      return;
    }
    if (!isTransitMode(leg.mode) || !leg.tripId) {
      loadedTrip.current = null;
      setStops(existing);
      setFailed(false);
      setLoading(false);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (loadedTrip.current === leg.tripId) {
      setLoading(false);
      return;
    }

    const tripId = leg.tripId;
    const from = leg.from;
    const to = leg.to;
    const controller = new AbortController();
    setLoading(true);
    fetchTrip(tripId)
      .then((trip) => {
        if (controller.signal.aborted) return;
        loadedTrip.current = tripId;
        setStops(stopsBetween(trip, from, to));
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          loadedTrip.current = null;
          setStops([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [enabled, tick, leg.mode, leg.tripId, leg.intermediateStops]);

  return {
    stops,
    loading,
    failed,
    retry: () => {
      loadedTrip.current = null;
      setTick((value) => value + 1);
    },
  };
}

function IntermediateStop({
  stop,
  color,
  current = false,
  onOpenStation,
}: {
  stop: Place;
  color: string;
  current?: boolean;
  onOpenStation?: (place: Place) => void;
}) {
  const { locale, t } = useI18n();
  const arrives = stopArrival(stop, locale);
  const departs = stopDeparture(stop, locale);
  const dwells = Boolean(arrives && departs && arrives !== departs);
  return (
    <li
      className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3"
      data-progress={current ? "current" : undefined}
      data-testid="call-at"
    >
      <div className="call-clock py-1 text-right font-mono text-[11px] tabular-nums">
        <span className="call-clock-arrive">{arrives}</span>
        {dwells ? <span className="call-clock-depart">{departs}</span> : null}
      </div>
      <div className="flex flex-col items-center">
        <span
          className="mt-2 h-1.5 w-1.5 rounded-full"
          style={{ background: color, opacity: current ? 1 : 0.55 }}
        />
        <span className="w-[3px] flex-1" style={{ background: color }} />
      </div>
      <div className="pb-2.5">
        <p className="text-[13px] leading-snug text-ink-soft">
          <StationName place={stop} onOpenStation={onOpenStation} />
          <span className="call-kind">{t("detail.arrives")}</span>
          {current ? (
            <span className="now-stamp ml-2">{t("detail.now")}</span>
          ) : null}
        </p>
        {dwells ? (
          <p className="call-dwell">
            {t("detail.departs")} {departs}
          </p>
        ) : null}
        {trackChange(stop) ? (
          <div className="ticket-marks">
            <TrackFault place={stop} testId="detail-track-call" />
          </div>
        ) : stop.track ? (
          <p className="text-[11px] text-ink-muted">
            {t("detail.platform", { track: stop.track })}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function StationBoardStamp({
  place,
  kind,
  onOpenStation,
}: {
  place: Place;
  kind: "from" | "change" | "to";
  onOpenStation?: (place: Place) => void;
}) {
  const { t } = useI18n();
  if (!onOpenStation || !place.stopId) return null;
  const label =
    kind === "change"
      ? t("detail.boardChange")
      : kind === "to"
        ? t("detail.boardTo")
        : t("detail.boardFrom");
  return (
    <button
      type="button"
      className="stamp stamp-plain board-open-stamp"
      data-testid={`board-stamp-${kind}`}
      onClick={() => onOpenStation(place)}
    >
      {label}
    </button>
  );
}

function StationName({
  place,
  onOpenStation,
}: {
  place: Place;
  onOpenStation?: (place: Place) => void;
}) {
  const { t } = useI18n();
  if (!onOpenStation || !place.stopId) {
    return <>{place.name}</>;
  }
  return (
    <button
      type="button"
      className="station-name"
      onClick={() => onOpenStation(place)}
      aria-label={`${place.name}. ${t("board.openStation")}`}
    >
      {place.name}
    </button>
  );
}

function DelayLabel({ minutes }: { minutes: number }) {
  const { t } = useI18n();
  return (
    <span
      className={`font-mono text-xs font-medium ${
        minutes > 0 ? "text-signal" : "text-ink-soft"
      }`}
    >
      {minutes > 0
        ? t("detail.delayLate", { minutes })
        : t("detail.delayEarly", { minutes })}
    </span>
  );
}
