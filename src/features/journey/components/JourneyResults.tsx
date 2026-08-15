"use client";

import { useMemo, useState } from "react";
import type { Itinerary, TransferFilter } from "@/lib/transit/types";
import { useI18n } from "@/i18n/provider";
import {
  emptyFilterCopy,
  sortIndexedItineraries,
  type IndexedItinerary,
  type ResultSort,
} from "../lib/filters";
import { CarrierCompare } from "./CarrierCompare";
import { ItineraryDetail } from "./ItineraryDetail";
import { ItineraryList } from "./ItineraryList";
import { ShareJourney } from "./ShareJourney";

type JourneyResultsProps = {
  loading: boolean;
  itineraries: Itinerary[];
  afterTransfers: IndexedItinerary[];
  filtered: IndexedItinerary[];
  selected: Itinerary | null;
  selectedIndex: number;
  selectedCarriers: string[];
  transferFilter: TransferFilter;
  shareUrl: string;
  refreshing?: boolean;
  liveAt?: number | null;
  liveFresh?: boolean;
  onSelectedCarriersChange: (names: string[]) => void;
  onSelectedIndexChange: (index: number) => void;
  onTransferFilterChange?: (value: TransferFilter) => void;
  onRefresh?: () => void;
  onTimeShift?: (direction: "earlier" | "later") => void;
};

const SORTS: ResultSort[] = ["depart", "fastest", "transfers"];

export function JourneyResults({
  loading,
  itineraries,
  afterTransfers,
  filtered,
  selected,
  selectedIndex,
  selectedCarriers,
  transferFilter,
  shareUrl,
  refreshing = false,
  liveAt = null,
  liveFresh = false,
  onSelectedCarriersChange,
  onSelectedIndexChange,
  onTransferFilterChange,
  onRefresh,
  onTimeShift,
}: JourneyResultsProps) {
  const { locale, t, tp } = useI18n();
  const [sort, setSort] = useState<ResultSort>("depart");
  const sorted = useMemo(
    () => sortIndexedItineraries(filtered, sort),
    [filtered, sort],
  );
  const countLabel =
    filtered.length !== itineraries.length
      ? tp("connectionsOf", filtered.length, { total: itineraries.length })
      : tp("connections", filtered.length);
  const filtersOn =
    transferFilter !== "all" || selectedCarriers.length > 0;

  function resetFilters() {
    onSelectedCarriersChange([]);
    onTransferFilterChange?.("all");
  }

  return (
    <div
      data-testid="journey-results"
      data-tour="board"
      className="space-y-4"
      aria-live="polite"
      aria-busy={loading || refreshing}
    >
      {loading || refreshing ? (
        <div className="searching-ribbon" aria-hidden="true" />
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="kicker">{t("results.departures")}</p>
          <p className="font-display mt-1 text-xl italic">{countLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {shareUrl ? (
              <ShareJourney
                url={shareUrl}
                itinerary={selected}
                fromName={selected?.legs[0]?.from.name}
                toName={selected?.legs[selected.legs.length - 1]?.to.name}
              />
            ) : null}
            {onRefresh ? (
              <button
                type="button"
                className="stamp"
                data-testid="refresh-live"
                onClick={onRefresh}
                disabled={refreshing || loading}
              >
                {t("results.refresh")}
              </button>
            ) : null}
            <p className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
              {liveFresh ? t("results.live") : t("results.stale")}
            </p>
          </div>
          {liveAt ? (
            <p className="font-mono text-[10px] tracking-wide text-ink-muted uppercase">
              {t("results.updated", {
                time: new Date(liveAt).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="rail-ornament" aria-hidden="true" />
      {onTimeShift ? (
        <div className="mode-switch" data-cols="2" role="group">
          <button
            type="button"
            data-testid="earlier-connections"
            disabled={loading || refreshing}
            onClick={() => onTimeShift("earlier")}
          >
            {t("results.earlier")}
          </button>
          <button
            type="button"
            data-testid="later-connections"
            disabled={loading || refreshing}
            onClick={() => onTimeShift("later")}
          >
            {t("results.later")}
          </button>
        </div>
      ) : null}
      <div className="mode-switch" data-cols="3" role="group" aria-label={t("results.sort")}>
        {SORTS.map((value) => (
          <button
            key={value}
            type="button"
            data-on={sort === value}
            data-testid={`sort-${value}`}
            aria-pressed={sort === value}
            onClick={() => setSort(value)}
          >
            {value === "depart"
              ? t("results.sortDepart")
              : value === "fastest"
                ? t("results.sortFastest")
                : t("results.sortTransfers")}
          </button>
        ))}
      </div>
      <CarrierCompare
        itineraries={afterTransfers.map((item) => item.itinerary)}
        selectedCarriers={selectedCarriers}
        onSelectedCarriersChange={onSelectedCarriersChange}
        onJumpToItinerary={(localIndex) => {
          const original = afterTransfers[localIndex]?.index;
          if (original != null) onSelectedIndexChange(original);
        }}
      />
      {sorted.length === 0 ? (
        <div className="space-y-3 border border-dashed border-rule px-3 py-6 text-center">
          <p className="text-sm text-ink-muted">
            {t(emptyFilterCopy(transferFilter, selectedCarriers.length > 0))}
          </p>
          {filtersOn ? (
            <button
              type="button"
              className="stamp"
              data-testid="reset-filters"
              onClick={resetFilters}
            >
              {t("results.resetFilters")}
            </button>
          ) : null}
        </div>
      ) : (
        <ItineraryList
          itineraries={sorted.map((item) => item.itinerary)}
          selectedIndex={Math.max(
            0,
            sorted.findIndex((item) => item.index === selectedIndex),
          )}
          onSelect={(index) =>
            onSelectedIndexChange(sorted[index]?.index ?? 0)
          }
        />
      )}
      {selected && <ItineraryDetail itinerary={selected} />}
    </div>
  );
}
