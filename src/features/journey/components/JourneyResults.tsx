"use client";

import { useMemo, useState } from "react";
import type { Itinerary, Place, TransferFilter } from "@/lib/transit/types";
import { useI18n } from "@/i18n/provider";
import {
  emptyFilterCopy,
  sortIndexedItineraries,
  type IndexedItinerary,
  type ResultSort,
} from "../lib/filters";
import { lastDepartureKey } from "../lib/ticket-notes";
import { ServiceGap } from "./Board";
import { BoardCount, BoardMast } from "./BoardMast";
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
  serviceFrom?: string | null;
  allDay?: boolean;
  refreshing?: boolean;
  liveAt?: number | null;
  liveFresh?: boolean;
  onSelectedCarriersChange: (names: string[]) => void;
  onSelectedIndexChange: (index: number) => void;
  onTransferFilterChange?: (value: TransferFilter) => void;
  onRefresh?: () => void;
  onTimeShift?: (direction: "earlier" | "later") => void;
  onOpenStation?: (place: Place) => void;
  watchingKey?: string | null;
  watchDenied?: boolean;
  onWatch?: (itinerary: Itinerary) => void;
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
  serviceFrom = null,
  allDay = false,
  refreshing = false,
  liveAt = null,
  liveFresh = false,
  onSelectedCarriersChange,
  onSelectedIndexChange,
  onTransferFilterChange,
  onRefresh,
  onTimeShift,
  onOpenStation,
  watchingKey = null,
  watchDenied = false,
  onWatch,
}: JourneyResultsProps) {
  const { t, tp } = useI18n();
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
      {serviceFrom ? <ServiceGap iso={serviceFrom} /> : null}
      <BoardMast
        kicker={t("results.departures")}
        headline={
          <BoardCount count={filtered.length} label={countLabel} />
        }
        share={
          shareUrl ? (
            <ShareJourney
              url={shareUrl}
              itinerary={selected}
              fromName={selected?.legs[0]?.from.name}
              toName={selected?.legs[selected.legs.length - 1]?.to.name}
            />
          ) : null
        }
        liveAt={liveAt}
        liveFresh={liveFresh}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onTimeShift={onTimeShift}
      >
        <div
          className="board-sort"
          role="group"
          aria-label={t("results.sort")}
        >
          {SORTS.map((value) => {
            const label =
              value === "depart"
                ? t("results.sortDepart")
                : value === "fastest"
                  ? t("results.sortFastest")
                  : t("results.sortTransfersShort");
            const full =
              value === "transfers" ? t("results.sortTransfers") : label;
            return (
              <button
                key={value}
                type="button"
                className="stamp"
                data-on={sort === value}
                data-testid={`sort-${value}`}
                aria-pressed={sort === value}
                aria-label={full}
                title={full}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </BoardMast>
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
          lastOfDayKey={allDay ? lastDepartureKey(itineraries) : null}
          watchingKey={watchingKey}
          watchDenied={watchDenied}
          onWatch={onWatch}
          onSelect={(index) =>
            onSelectedIndexChange(sorted[index]?.index ?? 0)
          }
        />
      )}
      {selected && (
        <ItineraryDetail itinerary={selected} onOpenStation={onOpenStation} />
      )}
    </div>
  );
}
