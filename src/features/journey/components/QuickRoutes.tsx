"use client";

import { localizePlaceName } from "@/i18n/place-name";
import { useI18n } from "@/i18n/provider";
import type { RecentSearch } from "../lib/recent";
import type { PinnedSearch } from "../lib/pinned";

type QuickRoutesProps = {
  recents?: RecentSearch[];
  pins?: PinnedSearch[];
  onRecentSelect?: (item: RecentSearch) => void;
  onPinnedSelect?: (item: PinnedSearch) => void;
  /** Compact strip for map chrome. */
  compact?: boolean;
  maxRecents?: number;
};

export function QuickRoutes({
  recents = [],
  pins = [],
  onRecentSelect,
  onPinnedSelect,
  compact = false,
  maxRecents = 4,
}: QuickRoutesProps) {
  const { messages, t } = useI18n();
  const kinds = messages.placeKind;
  const showPins = pins.length > 0 && onPinnedSelect;
  const showRecents = recents.length > 0 && onRecentSelect;
  if (!showPins && !showRecents) return null;

  function label(
    fromName: string,
    toName: string,
    via: Array<{ name: string }>,
  ) {
    const viaBit =
      via.length > 0
        ? ` · ${via.map((stop) => localizePlaceName(stop.name, kinds)).join(" · ")}`
        : "";
    return `${localizePlaceName(fromName, kinds)} → ${localizePlaceName(toName, kinds)}${viaBit}`;
  }

  return (
    <div
      className={compact ? "quick-routes quick-routes-compact" : "quick-routes"}
      data-testid="quick-routes"
    >
      {showPins ? (
        <div data-testid="pinned-searches">
          <p className="kicker">{t("pinned.kicker")}</p>
          <ul className="quick-routes-list">
            {pins.map((item) => {
              const roleLabel =
                item.role === "home"
                  ? t("search.pinnedHome")
                  : item.role === "work"
                    ? t("search.pinnedWork")
                    : t("search.pinnedOther");
              return (
                <li
                  key={`${item.role}-${item.from.id}-${item.to.id}-${item.savedAt}`}
                >
                  <button
                    type="button"
                    className="stamp stamp-plain w-full text-left"
                    data-testid={`pinned-${item.role}`}
                    onClick={() => onPinnedSelect(item)}
                  >
                    {roleLabel} ·{" "}
                    {label(item.from.name, item.to.name, item.via)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {showRecents ? (
        <div data-testid="recent-searches">
          <p className="kicker">{t("recent.kicker")}</p>
          <ul className="quick-routes-list">
            {recents.slice(0, maxRecents).map((item) => (
              <li key={`${item.from.id}-${item.to.id}-${item.savedAt}`}>
                <button
                  type="button"
                  className="stamp stamp-plain w-full text-left"
                  onClick={() => onRecentSelect(item)}
                >
                  {label(item.from.name, item.to.name, item.via)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
