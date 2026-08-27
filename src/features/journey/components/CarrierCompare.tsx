"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/provider";
import {
  compareCarriers,
  formatCarrierDuration,
  shortCarrierName,
} from "@/lib/carriers";
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
  const { t, tp } = useI18n();
  const carriers = compareCarriers(itineraries);
  if (carriers.length === 0) return null;

  const showingAll = selectedCarriers.length === 0;
  const fastestDuration = Math.min(
    ...carriers.map((carrier) => carrier.fastestDuration),
  );
  const fewestTransfers = Math.min(
    ...carriers.map((carrier) => carrier.fewestTransfers),
  );
  const showLedger = carriers.length >= 2;

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
      {showLedger ? (
        <div
          className="carrier-ledger"
          role="table"
          aria-label={t("carriers.title")}
          data-testid="carrier-ledger"
        >
          <div className="carrier-ledger-row carrier-ledger-head" role="row">
            <span role="columnheader">{t("carriers.carrier")}</span>
            <span role="columnheader">{t("carriers.fastest")}</span>
            <span role="columnheader">{t("carriers.transfers")}</span>
            <span role="columnheader">{t("carriers.routes")}</span>
          </div>
          {carriers.map((carrier) => {
            const on = selectedCarriers.includes(carrier.name);
            const isFastest = carrier.fastestDuration === fastestDuration;
            const isFewest = carrier.fewestTransfers === fewestTransfers;
            return (
              <button
                type="button"
                key={`ledger-${carrier.name}`}
                className="carrier-ledger-row"
                role="row"
                data-on={on}
                data-fastest={isFastest}
                data-fewest={isFewest}
                aria-pressed={on}
                aria-label={carrier.name}
                style={{ "--carrier": carrier.color } as CSSProperties}
                onClick={() =>
                  toggleCarrier(carrier.name, carrier.bestItineraryIndex)
                }
              >
                <span className="carrier-ledger-name" role="cell">
                  <span className="carrier-ledger-mark" aria-hidden="true" />
                  <span>
                    <span className="carrier-ledger-short">
                      {shortCarrierName(carrier.name)}
                    </span>
                    {isFastest ? (
                      <span className="carrier-ledger-tag">
                        {t("carriers.best")}
                      </span>
                    ) : null}
                    {isFewest && !isFastest ? (
                      <span className="carrier-ledger-tag carrier-ledger-tag-fewest">
                        {t("carriers.fewest")}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span role="cell">
                  {formatCarrierDuration(carrier.fastestDuration, t)}
                </span>
                <span role="cell">
                  {carrier.fewestTransfers === 0
                    ? t("detail.direct")
                    : tp("transfersShort", carrier.fewestTransfers)}
                </span>
                <span role="cell">{carrier.connections}</span>
              </button>
            );
          })}
        </div>
      ) : null}
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
