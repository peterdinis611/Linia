"use client";

import { useEffect, useState } from "react";
import { localizePlaceName } from "@/i18n/place-name";
import { useI18n } from "@/i18n/provider";
import { HowToGuide } from "./HowToUse";
import type { RecentSearch } from "../lib/recent";
import type { PinnedSearch } from "../lib/pinned";

export function StationClock() {
  const { locale, t } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = now
    ? now.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "––:––:––";

  return (
    <div className="board-clock reveal reveal-d2" data-testid="station-clock">
      <span className="kicker">{t("board.clock")}</span>
      <time dateTime={now?.toISOString()} suppressHydrationWarning>
        {label}
      </time>
    </div>
  );
}

export function SearchingBoard() {
  const { t } = useI18n();
  return (
    <div
      data-testid="searching-board"
      className="searching-board"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="searching-signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <p className="kicker">{t("board.searchingKicker")}</p>
        <p className="font-display mt-1 text-lg italic">{t("board.searchingTitle")}</p>
      </div>
      <div className="searching-flaps" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="searching-track" aria-hidden="true" />
    </div>
  );
}

export function EmptyBoard({
  hasSearched,
  kicker,
  title,
  body,
  recents = [],
  pins = [],
  onRecentSelect,
  onPinnedSelect,
  onTour,
}: {
  hasSearched: boolean;
  kicker: string;
  title: string;
  body: string;
  recents?: RecentSearch[];
  pins?: PinnedSearch[];
  onRecentSelect?: (item: RecentSearch) => void;
  onPinnedSelect?: (item: PinnedSearch) => void;
  onTour?: () => void;
}) {
  const { locale, t } = useI18n();
  return (
    <div
      data-testid="empty-board"
      data-tour="board"
      className="reveal reveal-d4 relative overflow-hidden border border-dashed border-rule px-5 py-8"
    >
      <SignalGlyph />
      {hasSearched && <p className="empty-mark mb-5">{t("board.emptyMark")}</p>}
      <p className="kicker">{kicker}</p>
      <p className="font-display mt-2 max-w-[22ch] text-2xl leading-tight italic">
        {title}
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        {body}
      </p>
      {!hasSearched && pins.length > 0 && onPinnedSelect ? (
        <div className="mt-5" data-testid="pinned-searches">
          <p className="kicker">{t("pinned.kicker")}</p>
          <p className="mt-1 text-sm font-semibold tracking-tight">{t("pinned.title")}</p>
          <ul className="mt-3 space-y-2">
            {pins.map((item) => {
              const viaLabel =
                item.via.length > 0
                  ? ` · ${item.via.map((stop) => localizePlaceName(stop.name, locale)).join(" · ")}`
                  : "";
              const roleLabel =
                item.role === "home"
                  ? t("search.pinnedHome")
                  : item.role === "work"
                    ? t("search.pinnedWork")
                    : t("search.pinnedOther");
              return (
                <li key={`${item.role}-${item.from.id}-${item.to.id}-${item.savedAt}`}>
                  <button
                    type="button"
                    className="stamp stamp-plain w-full text-left"
                    data-testid={`pinned-${item.role}`}
                    onClick={() => onPinnedSelect(item)}
                  >
                    {roleLabel} · {localizePlaceName(item.from.name, locale)} →{" "}
                    {localizePlaceName(item.to.name, locale)}
                    {viaLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {!hasSearched && recents.length > 0 && onRecentSelect ? (
        <div className="mt-5" data-testid="recent-searches">
          <p className="kicker">{t("recent.kicker")}</p>
          <p className="mt-1 text-sm font-semibold tracking-tight">{t("recent.title")}</p>
          <ul className="mt-3 space-y-2">
            {recents.map((item) => {
              const viaLabel =
                item.via.length > 0
                  ? ` · ${item.via.map((stop) => localizePlaceName(stop.name, locale)).join(" · ")}`
                  : "";
              return (
                <li key={`${item.from.id}-${item.to.id}-${item.savedAt}`}>
                  <button
                    type="button"
                    className="stamp stamp-plain w-full text-left"
                    onClick={() => onRecentSelect(item)}
                  >
                    {localizePlaceName(item.from.name, locale)} →{" "}
                    {localizePlaceName(item.to.name, locale)}
                    {viaLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {!hasSearched && (
        <div className="mt-5">
          <HowToGuide onTour={onTour} />
        </div>
      )}
      <div className="rail-ornament mt-6" aria-hidden="true" />
    </div>
  );
}

function SignalGlyph() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="pointer-events-none absolute -right-2 -top-3 h-28 w-28 opacity-[0.09]"
      aria-hidden="true"
    >
      <rect x="36" y="8" width="8" height="64" fill="currentColor" />
      <circle cx="40" cy="22" r="10" fill="var(--signal)" />
      <circle cx="40" cy="44" r="8" fill="currentColor" opacity="0.35" />
      <circle cx="40" cy="62" r="6" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
