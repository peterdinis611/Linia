"use client";

import { useI18n } from "@/i18n/provider";
import {
  contrastText,
  formatTime,
  isTransitMode,
  modeColor,
  routeHex,
} from "@/lib/format";
import type { StopTimeEvent } from "@/lib/transit/types";
import { alertsFromStopTime } from "../lib/alerts";
import { AlertStrip } from "./AlertStrip";

type StationBoardProps = {
  stopTimes: StopTimeEvent[];
  arriveBy: boolean;
  selectedTripId?: string | null;
  onSelect: (event: StopTimeEvent) => void;
};

export function StationBoard({
  stopTimes,
  arriveBy,
  selectedTripId,
  onSelect,
}: StationBoardProps) {
  const { locale, t } = useI18n();

  return (
    <ul
      className="space-y-3"
      role="listbox"
      aria-label={arriveBy ? t("board.stationArrivals") : t("board.stationDepartures")}
      data-testid="station-board"
    >
      {stopTimes.map((event, index) => {
        const when =
          event.place.departure ??
          event.place.arrival ??
          event.place.scheduledDeparture ??
          event.place.scheduledArrival;
        const scheduled =
          event.place.scheduledDeparture ?? event.place.scheduledArrival ?? when;
        const delayMinutesValue = (() => {
          if (!event.realTime || !when || !scheduled) return null;
          const actual = new Date(when).getTime();
          const planned = new Date(scheduled).getTime();
          if (Number.isNaN(actual) || Number.isNaN(planned)) return null;
          const minutes = Math.round((actual - planned) / 60_000);
          return minutes === 0 ? null : minutes;
        })();
        const background =
          routeHex(event.routeColor) ?? modeColor(event.mode);
        const label =
          event.displayName ||
          event.routeShortName ||
          event.routeLongName ||
          (isTransitMode(event.mode) ? t(`modes.${event.mode}`) : event.mode);
        const destination =
          event.headsign || event.tripTo?.name || "";
        const selected = Boolean(
          event.tripId && event.tripId === selectedTripId,
        );
        const alerts = alertsFromStopTime(event);
        const cancelled = Boolean(event.cancelled || event.tripCancelled);

        return (
          <li
            key={`${event.tripId ?? label}-${when ?? index}`}
            role="none"
          >
            <button
              type="button"
              role="option"
              className="ticket w-full px-4 py-3.5 text-left"
              data-selected={selected}
              aria-selected={selected}
              data-testid={`station-row-${index}`}
              onClick={() => onSelect(event)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[0.95rem] font-medium tracking-tight">
                  {formatTime(when, locale)}
                </p>
                <span
                  className="px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
                  style={{ background, color: contrastText(background) }}
                >
                  {label}
                </span>
              </div>
              <p className="mt-1 text-xs tracking-wide text-ink-muted">
                {destination
                  ? t("detail.toHeadsign", { name: destination })
                  : t(`modes.${event.mode}`)}
                {event.agencyName ? ` · ${event.agencyName}` : ""}
                {event.place.track
                  ? ` · ${t("detail.platform", { track: event.place.track })}`
                  : ""}
                {delayMinutesValue != null && delayMinutesValue > 0
                  ? ` · ${t("detail.delayLate", { minutes: delayMinutesValue })}`
                  : ""}
                {cancelled ? ` · ${t("detail.cancelled")}` : ""}
              </p>
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
