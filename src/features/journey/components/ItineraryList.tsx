"use client";

import { useI18n } from "@/i18n/provider";
import { transitAgencies } from "@/lib/carriers";
import {
  contrastText,
  delayMinutes,
  formatClockRange,
  formatDuration,
  isTransitMode,
  legColor,
} from "@/lib/format";
import type { Itinerary, Leg } from "@/lib/transit/types";
import { alertsFromItinerary } from "../lib/alerts";
import { itineraryIsLive, legPhase } from "../lib/progress";
import { AlertStrip } from "./AlertStrip";

type ItineraryListProps = {
  itineraries: Itinerary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function ItineraryList({
  itineraries,
  selectedIndex,
  onSelect,
}: ItineraryListProps) {
  const { locale, t, tp } = useI18n();
  return (
    <ul
      className="space-y-3"
      role="listbox"
      aria-label={t("results.departures")}
    >
      {itineraries.map((itinerary, index) => {
        const selected = index === selectedIndex;
        const transitLegs = itinerary.legs.filter((leg) => isTransitMode(leg.mode));
        const delayed = itinerary.legs.some((leg) => (delayMinutes(leg) ?? 0) > 0);
        const carriers = transitAgencies(itinerary);
        const alerts = alertsFromItinerary(itinerary);
        const live = itineraryIsLive(itinerary);

        return (
          <li key={`${itinerary.startTime}-${itinerary.endTime}-${index}`} role="none">
            <button
              type="button"
              role="option"
              onClick={() => onSelect(index)}
              data-selected={selected}
              aria-selected={selected}
              className="ticket w-full px-4 py-3.5 text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[0.95rem] font-medium tracking-tight">
                  {formatClockRange(itinerary.startTime, itinerary.endTime, locale)}
                </p>
                <p className="font-display text-lg italic text-signal">
                  {formatDuration(itinerary.duration, t)}
                </p>
              </div>
              <p className="mt-1 text-xs tracking-wide text-ink-muted">
                {itinerary.transfers === 0
                  ? t("results.direct")
                  : tp("transfers", itinerary.transfers)}
                {live ? ` · ${t("results.onTheLine")}` : ""}
                {delayed ? ` · ${t("results.liveDelay")}` : ""}
                {carriers.length > 0 ? ` · ${carriers.join(" · ")}` : ""}
              </p>
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
                {(transitLegs.length > 0 ? transitLegs : itinerary.legs.slice(0, 4)).map(
                  (leg, legIndex) => (
                    <ModeChip key={`${leg.startTime}-${legIndex}`} leg={leg} />
                  ),
                )}
              </div>
              {alerts.length > 0 ? (
                <div className="mt-2">
                  <AlertStrip alerts={alerts} compact />
                </div>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
