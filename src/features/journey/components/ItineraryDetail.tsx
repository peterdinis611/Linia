"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { ChevronDown } from "lucide-react";
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
  stopTime,
} from "@/lib/format";
import {
  stopsBetween,
  type Itinerary,
  type Leg,
  type Place,
} from "@/lib/transit/types";
import { fetchTrip } from "@/lib/transit/queries";
import { alertsFromItinerary, uniqueAlerts } from "../lib/alerts";
import { AlertStrip } from "./AlertStrip";

type ItineraryDetailProps = {
  itinerary: Itinerary;
  onOpenStation?: (place: Place) => void;
};

export function ItineraryDetail({ itinerary, onOpenStation }: ItineraryDetailProps) {
  const { t, tp } = useI18n();

  return (
    <section className="journey-sheet">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-rule pb-3">
        <div>
          <p className="kicker">{t("detail.kicker")}</p>
          <h2 className="font-display mt-1 text-xl italic">
            {t("detail.title")}
          </h2>
        </div>
        <p className="font-mono text-[11px] tracking-wide text-ink-muted">
          {formatDuration(itinerary.duration, t)} ·{" "}
          {itinerary.transfers === 0
            ? t("detail.direct")
            : tp("transfersShort", itinerary.transfers)}
        </p>
      </div>
      <AlertStrip alerts={alertsFromItinerary(itinerary)} />
      <ol>
        {itinerary.legs.map((leg, index) => (
          <LegBlock
            key={`${leg.startTime}-${index}`}
            leg={leg}
            isLast={index === itinerary.legs.length - 1}
            onOpenStation={onOpenStation}
          />
        ))}
      </ol>
    </section>
  );
}

function LegBlock({
  leg,
  isLast,
  onOpenStation,
}: {
  leg: Leg;
  isLast: boolean;
  onOpenStation?: (place: Place) => void;
}) {
  const { locale, t, tp } = useI18n();
  const color = legColor(leg);
  const transit = isTransitMode(leg.mode);
  const {
    stops: intermediates,
    loading: loadingStops,
    failed: failedStops,
    retry: retryStops,
  } = useIntermediateStops(leg);
  const delay = delayMinutes(leg);
  const arriveDelay = arrivalDelayMinutes(leg);

  if (!transit) {
    return (
      <li className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3">
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
          <p className="mt-1 text-xs text-ink-muted">
            {t(`modes.${leg.mode}`)} · {formatDuration(leg.duration, t)}
            {formatDistance(leg.distance) ? ` · ${formatDistance(leg.distance)}` : ""}
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-ink-muted">
              {formatTime(leg.endTime, locale)}
            </span>
            <p className="text-sm text-ink-soft">
              <StationName place={leg.to} onOpenStation={onOpenStation} />
            </p>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
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
          </p>
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
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {formatDuration(leg.duration, t)}
            {leg.agencyName ? ` · ${leg.agencyName}` : ""}
            {leg.from.track ? ` · ${t("detail.platform", { track: leg.from.track })}` : ""}
          </p>
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
            <button type="button" className="stamp" onClick={retryStops}>
              {t("detail.retryStops")}
            </button>
          </span>
        </p>
      )}

      {intermediates.length > 0 && (
        <details className="group">
          <summary className="grid cursor-pointer grid-cols-[3.4rem_14px_1fr] gap-x-3 list-none [&::-webkit-details-marker]:hidden">
            <span />
            <span className="flex flex-col items-center">
              <span className="w-[3px] flex-1" style={{ background: color }} />
            </span>
            <span className="flex items-center gap-1 py-1 text-xs font-medium text-ink-muted">
              <ChevronDown className="size-3.5 transition group-open:rotate-180" />
              {tp("stops", intermediates.length)}
            </span>
          </summary>
          <ol>
            {intermediates.map((stop, stopIndex) => (
              <IntermediateStop
                key={`${stop.name}-${stop.lat}-${stopIndex}`}
                stop={stop}
                color={color}
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
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {leg.to.track ? t("detail.platform", { track: leg.to.track }) : null}
            {arriveDelay != null && <DelayLabel minutes={arriveDelay} />}
          </p>
        </div>
      </div>
    </li>
  );
}

function useIntermediateStops(leg: Leg): {
  stops: Place[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
} {
  const [stops, setStops] = useState<Place[]>(leg.intermediateStops ?? []);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const existing = leg.intermediateStops ?? [];
    setStops(existing);
    setFailed(false);
    if (!isTransitMode(leg.mode) || existing.length > 0 || !leg.tripId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchTrip(leg.tripId)
      .then((trip) => {
        if (controller.signal.aborted) return;
        setStops(stopsBetween(trip, leg.from, leg.to));
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStops([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [leg, tick]);

  return {
    stops,
    loading,
    failed,
    retry: () => setTick((value) => value + 1),
  };
}

function IntermediateStop({
  stop,
  color,
  onOpenStation,
}: {
  stop: Place;
  color: string;
  onOpenStation?: (place: Place) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <li className="grid grid-cols-[3.4rem_14px_1fr] gap-x-3">
      <div className="py-1 text-right font-mono text-[11px] tabular-nums text-ink-muted">
        {stopTime(stop, locale)}
      </div>
      <div className="flex flex-col items-center">
        <span
          className="mt-2 h-1.5 w-1.5 rounded-full"
          style={{ background: color, opacity: 0.55 }}
        />
        <span className="w-[3px] flex-1" style={{ background: color }} />
      </div>
      <div className="pb-2.5">
        <p className="text-[13px] leading-snug text-ink-soft">
          <StationName place={stop} onOpenStation={onOpenStation} />
        </p>
        {stop.track && (
          <p className="text-[11px] text-ink-muted">
            {t("detail.platform", { track: stop.track })}
          </p>
        )}
      </div>
    </li>
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
