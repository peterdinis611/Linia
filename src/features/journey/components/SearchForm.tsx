"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { JourneyFormFieldErrors } from "@/lib/schemas";
import { MAX_VIA_STOPS } from "@/lib/transit/place";
import type { ModeFilter, SelectedPlace, TransferFilter } from "@/lib/transit/types";
import type { RouteMode } from "../hooks/use-journey-search";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { HallWhen } from "./HallWhen";

type SearchFormProps = {
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
  routeMode: RouteMode;
  leaveNow: boolean;
  datetime: string;
  arriveBy: boolean;
  allDay: boolean;
  modeFilter: ModeFilter;
  transferFilter: TransferFilter;
  accessible: boolean;
  bike: boolean;
  night: boolean;
  wantReturn: boolean;
  returnDatetime: string;
  loading: boolean;
  hasSearched?: boolean;
  transferCounts?: { direct: number; transfers: number } | null;
  fieldErrors?: JourneyFormFieldErrors;
  onFromChange: (place: SelectedPlace | null) => void;
  onToChange: (place: SelectedPlace | null) => void;
  onViaChange: (index: number, place: SelectedPlace | null) => void;
  onAddVia: () => void;
  onRemoveVia: (index: number) => void;
  onRouteModeChange: (mode: RouteMode) => void;
  onSwap: () => void;
  onLeaveNowChange: (value: boolean) => void;
  onDatetimeChange: (value: string) => void;
  onArriveByChange: (value: boolean) => void;
  onAllDayChange: (value: boolean) => void;
  onModeFilterChange: (value: ModeFilter) => void;
  onTransferFilterChange: (value: TransferFilter) => void;
  onAccessibleChange: (value: boolean) => void;
  onBikeChange: (value: boolean) => void;
  onNightChange: (value: boolean) => void;
  onWantReturnChange: (value: boolean) => void;
  onReturnDatetimeChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  geoBusy?: boolean;
  geoError?: string | null;
  onUseMyLocation?: () => void;
  onNearbyBoard?: () => void;
};

export function SearchForm({
  from,
  to,
  via,
  routeMode,
  leaveNow,
  datetime,
  arriveBy,
  allDay,
  modeFilter,
  transferFilter,
  accessible,
  bike,
  night,
  wantReturn,
  returnDatetime,
  loading,
  hasSearched = false,
  transferCounts,
  fieldErrors,
  onFromChange,
  onToChange,
  onViaChange,
  onAddVia,
  onRemoveVia,
  onRouteModeChange,
  onSwap,
  onLeaveNowChange,
  onDatetimeChange,
  onArriveByChange,
  onAllDayChange,
  onModeFilterChange,
  onTransferFilterChange,
  onAccessibleChange,
  onBikeChange,
  onNightChange,
  onWantReturnChange,
  onReturnDatetimeChange,
  onSearch,
  onClear,
  geoBusy = false,
  geoError = null,
  onUseMyLocation,
  onNearbyBoard,
}: SearchFormProps) {
  const { t } = useI18n();
  const [fieldsKey, setFieldsKey] = useState(0);
  const board = routeMode === "board";
  const canClear = Boolean(
    hasSearched ||
      from ||
      to ||
      via.length > 0 ||
      routeMode !== "point" ||
      !leaveNow ||
      arriveBy ||
      allDay ||
      modeFilter !== "all" ||
      transferFilter !== "all" ||
      accessible ||
      bike ||
      night ||
      wantReturn,
  );

  useEffect(() => {
    const messages = Object.values(fieldErrors ?? {}).filter(Boolean);
    if (messages.length === 0) return;
    document
      .querySelector("[data-testid='search-form'] .field-error")
      ?.scrollIntoView({ block: "center" });
  }, [fieldErrors]);

  const modeOptions: { value: Exclude<ModeFilter, "all">; label: string }[] = [
    { value: "train", label: t("search.modeRail") },
    { value: "bus", label: t("search.modeCoach") },
  ];
  const transferOptions: { value: Exclude<TransferFilter, "all">; label: string }[] = [
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
          ? t("search.transferTransfersCount", { count: transferCounts.transfers })
          : t("search.transferTransfers"),
    },
  ];

  return (
    <form
      className="reveal reveal-d3 space-y-5"
      noValidate
      aria-label={t("search.formLabel")}
      data-testid="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (loading) return;
        window.dispatchEvent(new Event("linia-commit-fields"));
        onSearch();
      }}
    >
      <div>
        <p className="kicker">{t("search.kicker")}</p>
        <p className="font-display mt-1 text-[1.65rem] leading-none italic">
          {t("search.title")}
        </p>
      </div>

      <div className="space-y-3" data-tour="origin">
        <PlaceAutocomplete
          key={`origin-${fieldsKey}`}
          label={t("search.origin")}
          placeholder={t("search.originPlaceholder")}
          value={from}
          bias={to}
          error={fieldErrors?.from ? t(fieldErrors.from) : undefined}
          onChange={onFromChange}
        />
        {onUseMyLocation || onNearbyBoard ? (
          <div className="-mt-1 space-y-1">
            <div className="flex flex-wrap gap-2">
              {onUseMyLocation ? (
                <button
                  type="button"
                  className="stamp"
                  data-testid="use-location"
                  disabled={geoBusy || loading}
                  onClick={onUseMyLocation}
                >
                  {geoBusy ? t("search.locating") : t("search.useLocation")}
                </button>
              ) : null}
              {onNearbyBoard ? (
                <button
                  type="button"
                  className="stamp"
                  data-testid="nearby-board"
                  disabled={geoBusy || loading}
                  onClick={onNearbyBoard}
                >
                  {geoBusy ? t("search.locating") : t("search.nearbyBoard")}
                </button>
              ) : null}
            </div>
            {geoError ? (
              <p role="alert" className="field-error">
                {t(geoError)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {!board ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              aria-label={t("search.swap")}
              onClick={onSwap}
              className="swap-knob -my-1"
            >
              <SwapIcon />
            </button>
          </div>
          <div data-tour="destination">
            <PlaceAutocomplete
              key={`destination-${fieldsKey}`}
              label={t("search.destination")}
              placeholder={t("search.destinationPlaceholder")}
              value={to}
              bias={from}
              error={fieldErrors?.to ? t(fieldErrors.to) : undefined}
              onChange={onToChange}
            />
          </div>
        </>
      ) : null}
      <div className="space-y-3">
        <div data-tour="route">
          <p className="kicker mb-2">{t("search.route")}</p>
          <div className="mode-switch" role="group" aria-label={t("search.routeType")}>
            <button
              type="button"
              data-on={routeMode === "point"}
              aria-pressed={routeMode === "point"}
              onClick={() => onRouteModeChange("point")}
            >
              {t("search.pointToPoint")}
            </button>
            <button
              type="button"
              data-on={routeMode === "via"}
              aria-pressed={routeMode === "via"}
              onClick={() => onRouteModeChange("via")}
            >
              {t("search.viaStops")}
            </button>
            <button
              type="button"
              data-on={board}
              aria-pressed={board}
              data-testid="station-board-mode"
              onClick={() => onRouteModeChange("board")}
            >
              {t("search.stationBoard")}
            </button>
          </div>
        </div>
        {routeMode === "via" && (
          <>
            {via.map((stop, index) => (
              <div key={`via-wrap-${index}-${fieldsKey}`} className="relative">
                <PlaceAutocomplete
                  label={t("search.viaN", { n: index + 1 })}
                  placeholder={t("search.viaPlaceholder")}
                  value={stop}
                  bias={from ?? to}
                  error={
                    fieldErrors?.[`via.${index}`]
                      ? t(fieldErrors[`via.${index}`]!)
                      : index === 0 && fieldErrors?.via
                        ? t(fieldErrors.via)
                        : undefined
                  }
                  onChange={(place) => onViaChange(index, place)}
                />
                <button
                  type="button"
                  className="search-clear mt-1 text-left"
                  aria-label={t("search.removeViaN", { n: index + 1 })}
                  onClick={() => onRemoveVia(index)}
                >
                  {t("search.removeVia")}
                </button>
              </div>
            ))}
            {via.length < MAX_VIA_STOPS && (
              <button type="button" className="stamp w-full" onClick={onAddVia}>
                {t("search.addVia")}
              </button>
            )}
          </>
        )}
      </div>

      <div className="space-y-5" data-tour="when">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-on={leaveNow}
          className="stamp"
          onClick={() => {
            onLeaveNowChange(!leaveNow);
          }}
          aria-pressed={leaveNow}
        >
          {t("search.leaveNow")}
        </button>
        <button
          type="button"
          data-on={arriveBy}
          className="stamp"
          onClick={() => {
            onArriveByChange(!arriveBy);
          }}
          aria-pressed={arriveBy}
        >
          {t("search.arriveBy")}
        </button>
      </div>
      <button
        type="button"
        data-on={allDay}
        data-testid="all-day"
        className="stamp w-full"
        onClick={() => {
          onAllDayChange(!allDay);
        }}
        aria-pressed={allDay}
      >
        {t("search.allDay")}
      </button>
      {!board ? (
        <button
          type="button"
          data-on={wantReturn}
          data-testid="return-trip"
          className="stamp w-full"
          onClick={() => onWantReturnChange(!wantReturn)}
          aria-pressed={wantReturn}
        >
          {t("search.returnTrip")}
        </button>
      ) : null}

      <div>
        <p className="kicker mb-2">
          {allDay
            ? t("search.allDayKicker")
            : arriveBy
              ? t("search.arrival")
              : t("search.departure")}
        </p>
        <HallWhen
          datetime={datetime}
          leaveNow={leaveNow}
          allDay={allDay}
          invalid={Boolean(fieldErrors?.time)}
          describedBy={fieldErrors?.time ? "journey-time-error" : undefined}
          onChange={onDatetimeChange}
        />
        {fieldErrors?.time && (
          <p id="journey-time-error" role="alert" className="field-error">
            {t(fieldErrors.time)}
          </p>
        )}
      </div>
      {wantReturn && !board ? (
        <div>
          <p className="kicker mb-2">{t("search.returnKicker")}</p>
          <HallWhen
            datetime={returnDatetime}
            leaveNow={false}
            allDay={allDay}
            invalid={Boolean(fieldErrors?.returnTime)}
            describedBy={fieldErrors?.returnTime ? "return-time-error" : undefined}
            idPrefix="return"
            onChange={onReturnDatetimeChange}
          />
          {fieldErrors?.returnTime && (
            <p id="return-time-error" role="alert" className="field-error">
              {t(fieldErrors.returnTime)}
            </p>
          )}
        </div>
      ) : null}
      </div>

      <div className="ticket-line" data-tour="line">
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
          <div className="ticket-line-row" role="group" aria-label={t("search.connectionsGroup")}>
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
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={loading}
          className="search-cta"
          data-busy={loading || undefined}
          aria-busy={loading}
        >
          {loading ? <span className="search-cta-spin" aria-hidden="true" /> : null}
          {loading
            ? t("search.submitting")
            : board
              ? t("search.submitBoard")
              : t("search.submit")}
        </button>
        {canClear && (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setFieldsKey((key) => key + 1);
              onClear();
            }}
            disabled={loading}
          >
            {t("search.clearTicket")}
          </button>
        )}
      </div>
    </form>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M7 7h11M16 4l3 3-3 3M17 17H6M8 14l-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
