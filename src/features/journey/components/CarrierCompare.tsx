"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/provider";
import { compareCarriers, shortCarrierName } from "@/lib/carriers";
import type { Itinerary } from "@/lib/transit/types";

type CarrierCompareProps = {
  itineraries: Itinerary[];
  selectedCarriers: string[];
  onSelectedCarriersChange: (names: string[]) => void;
  onJumpToItinerary: (index: number) => void;
};

export function CarrierCompare({
  itineraries,
  selectedCarriers,
  onSelectedCarriersChange,
  onJumpToItinerary,
}: CarrierCompareProps) {
  const { t } = useI18n();
  const carriers = compareCarriers(itineraries);
  if (carriers.length === 0) return null;

  const showingAll = selectedCarriers.length === 0;

  function toggleCarrier(name: string, bestIndex: number) {
    if (selectedCarriers.includes(name)) {
      onSelectedCarriersChange(selectedCarriers.filter((item) => item !== name));
      return;
    }
    onSelectedCarriersChange([...selectedCarriers, name]);
    onJumpToItinerary(bestIndex);
  }

  return (
    <div className="carrier-desk" data-testid="carrier-desk">
      <div className="carrier-desk-head">
        <p className="kicker">{t("carriers.compare")}</p>
        <p className="carrier-desk-count">{carriers.length}</p>
      </div>
      <div className="carrier-strip" role="group" aria-label={t("carriers.compare")}>
        <button
          type="button"
          className="carrier-chip carrier-chip-all"
          data-on={showingAll}
          aria-pressed={showingAll}
          aria-label={t("carriers.showAll")}
          onClick={() => onSelectedCarriersChange([])}
        >
          {t("carriers.all")}
        </button>
        {carriers.map((carrier) => {
          const on = selectedCarriers.includes(carrier.name);
          const short = shortCarrierName(carrier.name);
          return (
            <button
              type="button"
              key={carrier.name}
              className="carrier-chip"
              data-on={on}
              aria-pressed={on}
              title={carrier.name}
              aria-label={carrier.name}
              style={{ "--carrier": carrier.color } as CSSProperties}
              onClick={() => toggleCarrier(carrier.name, carrier.bestItineraryIndex)}
            >
              <span className="carrier-chip-mark" aria-hidden="true" />
              <span className="carrier-chip-name">{short}</span>
              <span className="carrier-chip-count">{carrier.connections}</span>
            </button>
          );
        })}
      </div>
      {!showingAll ? (
        <button
          type="button"
          className="search-clear"
          onClick={() => onSelectedCarriersChange([])}
        >
          {t("carriers.clear")}
        </button>
      ) : null}
    </div>
  );
}
