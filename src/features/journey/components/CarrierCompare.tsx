"use client";

import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/provider";
import { compareCarriers } from "@/lib/carriers";
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
    <div className="min-w-0 space-y-2">
      <p className="kicker">{t("carriers.compare")}</p>
      <div className="flex flex-wrap gap-1.5">
        <Toggle
          size="sm"
          variant="outline"
          pressed={showingAll}
          aria-label={t("carriers.showAll")}
          onPressedChange={() => onSelectedCarriersChange([])}
          className="h-7 px-2.5 text-xs"
        >
          {t("carriers.all")}
        </Toggle>
        {carriers.map((carrier) => {
          const on = selectedCarriers.includes(carrier.name);
          return (
            <Toggle
              key={carrier.name}
              size="sm"
              variant="outline"
              pressed={on}
              aria-pressed={on}
              onPressedChange={() =>
                toggleCarrier(carrier.name, carrier.bestItineraryIndex)
              }
              className="h-7 max-w-[11rem] px-2.5 text-xs"
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: carrier.color }}
                aria-hidden="true"
              />
              <span className="truncate">{carrier.name}</span>
            </Toggle>
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
