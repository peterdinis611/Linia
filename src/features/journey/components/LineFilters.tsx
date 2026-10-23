"use client";

import { useI18n } from "@/i18n/provider";
import type { ModeFilter, TransferFilter } from "@/lib/transit/types";

type LineFiltersProps = {
  modeFilter: ModeFilter;
  transferFilter: TransferFilter;
  accessible: boolean;
  bike: boolean;
  night: boolean;
  board?: boolean;
  transferCounts?: { direct: number; transfers: number } | null;
  onModeFilterChange: (value: ModeFilter) => void;
  onTransferFilterChange: (value: TransferFilter) => void;
  onAccessibleChange: (value: boolean) => void;
  onBikeChange: (value: boolean) => void;
  onNightChange: (value: boolean) => void;
};

export function LineFilters({
  modeFilter,
  transferFilter,
  accessible,
  bike,
  night,
  board = false,
  transferCounts = null,
  onModeFilterChange,
  onTransferFilterChange,
  onAccessibleChange,
  onBikeChange,
  onNightChange,
}: LineFiltersProps) {
  const { t } = useI18n();
  const modeOptions: { value: Exclude<ModeFilter, "all">; label: string }[] = [
    { value: "train", label: t("search.modeRail") },
    { value: "bus", label: t("search.modeCoach") },
  ];
  const transferOptions: {
    value: Exclude<TransferFilter, "all">;
    label: string;
  }[] = [
    {
      value: "direct",
      label:
        transferCounts != null
          ? t("search.transferDirectCount", { count: transferCounts.direct })
          : t("search.transferDirect"),
    },
    {
      value: "transfers",
      label:
        transferCounts != null
          ? t("search.transferTransfersCount", {
              count: transferCounts.transfers,
            })
          : t("search.transferTransfers"),
    },
  ];

  return (
    <div className="ticket-line" data-tour="line" data-testid="line-filters">
      <p className="kicker">{t("search.line")}</p>
      <div className="ticket-line-row" role="group" aria-label={t("search.modeGroup")}>
        {modeOptions.map((option) => {
          const selected = modeFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className="stamp"
              data-on={selected}
              aria-pressed={selected}
              onClick={() =>
                onModeFilterChange(selected ? "all" : option.value)
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {!board ? (
        <div
          className="ticket-line-row"
          role="group"
          aria-label={t("search.connectionsGroup")}
        >
          {transferOptions.map((option) => {
            const selected = transferFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className="stamp"
                data-on={selected}
                aria-pressed={selected}
                onClick={() =>
                  onTransferFilterChange(selected ? "all" : option.value)
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {!board ? (
        <>
          <button
            type="button"
            className="stamp w-full"
            data-on={accessible}
            data-testid="accessible"
            aria-pressed={accessible}
            onClick={() => onAccessibleChange(!accessible)}
          >
            {t("search.accessible")}
          </button>
          <button
            type="button"
            className="stamp w-full"
            data-on={bike}
            data-testid="bike"
            aria-pressed={bike}
            onClick={() => onBikeChange(!bike)}
          >
            {t("search.bike")}
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="stamp w-full"
        data-on={night}
        data-testid="night-rail"
        aria-pressed={night}
        onClick={() => onNightChange(!night)}
      >
        {t("search.nightRail")}
      </button>
    </div>
  );
}
