"use client";

import { useI18n } from "@/i18n/provider";
import {
  contrastText,
  formatClockRange,
  formatDuration,
  formatTime,
  isTransitMode,
  legColor,
  legName,
} from "@/lib/format";
import type { Itinerary, SelectedPlace } from "@/lib/transit/types";

type PrintTicketProps = {
  itinerary: Itinerary;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
};

export function PrintTicket({ itinerary, from, to }: PrintTicketProps) {
  const { locale, t, tp } = useI18n();
  const origin = from?.name ?? itinerary.legs[0]?.from.name ?? "—";
  const destination =
    to?.name ?? itinerary.legs[itinerary.legs.length - 1]?.to.name ?? "—";
  const issued = new Date(itinerary.startTime);

  return (
    <article className="print-ticket" data-testid="print-ticket">
      <p className="kicker">{t("share.ticketKicker")}</p>
      <h1 className="font-display mt-1 text-3xl italic">Linia</h1>
      <p className="mt-4 font-display text-2xl leading-tight italic">
        {origin} → {destination}
      </p>
      <p className="mt-2 font-mono text-sm tracking-wide">
        {issued.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p className="mt-1 font-mono text-lg font-medium tracking-tight">
        {formatClockRange(itinerary.startTime, itinerary.endTime, locale)}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {formatDuration(itinerary.duration, t)} ·{" "}
        {itinerary.transfers === 0
          ? t("detail.direct")
          : tp("transfers", itinerary.transfers)}
      </p>
      <div className="rail-ornament mt-5" aria-hidden="true" />
      <ol className="mt-5">
        {itinerary.legs.map((leg, index) => {
          const color = legColor(leg);
          const transit = isTransitMode(leg.mode);
          return (
            <li key={`${leg.startTime}-${index}`} className="print-leg">
              <p className="font-mono text-[11px] tabular-nums text-ink-muted">
                {formatTime(leg.startTime, locale)} – {formatTime(leg.endTime, locale)}
              </p>
              {transit ? (
                <p
                  className="mt-1 inline-block px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
                  style={{ background: color, color: contrastText(color) }}
                >
                  {legName(leg)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">{t(`modes.${leg.mode}`)}</p>
              )}
              <p className="mt-1 text-sm font-semibold tracking-tight">
                {leg.from.name} → {leg.to.name}
              </p>
              {leg.agencyName ? (
                <p className="text-xs text-ink-muted">{leg.agencyName}</p>
              ) : null}
              {leg.from.track ? (
                <p className="text-xs text-ink-muted">
                  {t("detail.platform", { track: leg.from.track })}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-[11px] tracking-wide text-ink-muted uppercase">
        {t("share.printedOn")} linia
      </p>
    </article>
  );
}
