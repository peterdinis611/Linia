"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { localizePlaceName } from "@/i18n/place-name";
import type { JourneyFormFieldErrors } from "@/lib/schemas";
import { MAX_VIA_STOPS } from "@/lib/transit/place";
import type {
  DistanceFilter,
  SelectedPlace,
} from "@/lib/transit/types";
import type { RouteMode } from "../hooks/use-journey-search";
import type { RecentSearch } from "../lib/recent";
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
  city: SelectedPlace | null;
  distanceFilter: DistanceFilter;
  wantReturn: boolean;
  returnDatetime: string;
  loading: boolean;
  hasSearched?: boolean;
  fieldErrors?: JourneyFormFieldErrors;
  recents?: RecentSearch[];
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
  onCityChange: (place: SelectedPlace | null) => void;
  onDistanceFilterChange: (value: DistanceFilter) => void;
  onWantReturnChange: (value: boolean) => void;
  onReturnDatetimeChange: (value: string) => void;
  onRecentSelect?: (item: RecentSearch) => void;
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
  city,
  distanceFilter,
  wantReturn,
  returnDatetime,
  loading,
  hasSearched = false,
  fieldErrors,
  recents = [],
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
  onCityChange,
  onDistanceFilterChange,
  onWantReturnChange,
  onReturnDatetimeChange,
  onRecentSelect,
  onSearch,
  onClear,
  geoBusy = false,
  geoError = null,
  onUseMyLocation,
  onNearbyBoard,
}: SearchFormProps) {
  const { messages, t } = useI18n();
  const kinds = messages.placeKind;
  const [fieldsKey, setFieldsKey] = useState(0);
  const suburban = distanceFilter === "suburban";
  const board = routeMode === "board";
  const scopeOpen = Boolean(city || distanceFilter !== "all");
  const canClear = Boolean(
    hasSearched ||
      from ||
      to ||
      via.length > 0 ||
      routeMode !== "point" ||
      !leaveNow ||
      arriveBy ||
      allDay ||
      city ||
      distanceFilter !== "all" ||
      wantReturn,
  );

  useEffect(() => {
    const messagesList = Object.values(fieldErrors ?? {}).filter(Boolean);
    if (messagesList.length === 0) return;
    document
      .querySelector("[data-testid='search-form'] .field-error")
      ?.scrollIntoView({ block: "center" });
  }, [fieldErrors]);

  const distanceOptions: {
    value: Exclude<DistanceFilter, "all">;
    label: string;
  }[] = [
    { value: "long", label: t("search.distanceLong") },
    { value: "suburban", label: t("search.distanceSuburban") },
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
        <p className="font-display mt-1 text-[1.65rem] leading-none">
          {t("search.title")}
        </p>
      </div>

      {!hasSearched && recents.length > 0 && onRecentSelect ? (
        <div data-testid="recent-searches">
          <p className="kicker">{t("recent.kicker")}</p>
          <ul className="mt-2 space-y-2">
            {recents.slice(0, 4).map((item) => {
              const viaLabel =
                item.via.length > 0
                  ? ` · ${item.via.map((stop) => localizePlaceName(stop.name, kinds)).join(" · ")}`
                  : "";
              return (
                <li key={`${item.from.id}-${item.to.id}-${item.savedAt}`}>
                  <button
                    type="button"
                    className="stamp stamp-plain w-full text-left"
                    onClick={() => onRecentSelect(item)}
                  >
                    {localizePlaceName(item.from.name, kinds)} →{" "}
                    {localizePlaceName(item.to.name, kinds)}
                    {viaLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3" data-tour="origin">
        <PlaceAutocomplete
          key={`origin-${fieldsKey}`}
          label={t("search.origin")}
          placeholder={
            suburban
              ? t("search.originSuburbanPlaceholder")
              : t("search.originPlaceholder")
          }
          value={from}
          bias={city ?? to}
          placeBias={city ? 3 : undefined}
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
              placeholder={
                suburban
                  ? t("search.destinationSuburbanPlaceholder")
                  : t("search.destinationPlaceholder")
              }
              value={to}
              bias={city ?? from}
              placeBias={city ? 3 : undefined}
              error={fieldErrors?.to ? t(fieldErrors.to) : undefined}
              onChange={onToChange}
            />
          </div>
        </>
      ) : null}
      {!suburban ? (
        <div className="space-y-3">
          <div data-tour="route">
            <p className="kicker mb-2">{t("search.route")}</p>
            <div
              className="mode-switch"
              role="group"
              aria-label={t("search.routeType")}
            >
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
                    kind="stop"
                    bias={city ?? from ?? to}
                    placeBias={city ? 3 : undefined}
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
      ) : null}

      <div className="space-y-5" data-tour="when">
        <div className={board ? "space-y-2" : "grid grid-cols-2 gap-2"}>
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
          {board ? (
            <div
              className="mode-switch"
              data-cols="2"
              role="group"
              aria-label={t("board.direction")}
            >
              <button
                type="button"
                data-on={!arriveBy}
                data-testid="board-departures"
                aria-pressed={!arriveBy}
                onClick={() => {
                  if (arriveBy) onArriveByChange(false);
                }}
              >
                {t("search.departure")}
              </button>
              <button
                type="button"
                data-on={arriveBy}
                data-testid="board-arrivals"
                aria-pressed={arriveBy}
                onClick={() => {
                  if (!arriveBy) onArriveByChange(true);
                }}
              >
                {t("search.arrival")}
              </button>
            </div>
          ) : (
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
          )}
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
              describedBy={
                fieldErrors?.returnTime ? "return-time-error" : undefined
              }
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

      <details
        className="desk-scope"
        data-desk="city"
        open={scopeOpen || undefined}
      >
        <summary className="desk-scope-summary">
          <span className="kicker">{t("search.cityKicker")}</span>
          <span className="desk-scope-hint">{t("search.cityHint")}</span>
        </summary>
        <div className="ticket-line mt-3">
          <PlaceAutocomplete
            key={`city-${fieldsKey}`}
            kind="city"
            label={t("search.city")}
            placeholder={t("search.cityPlaceholder")}
            value={city}
            error={fieldErrors?.city ? t(fieldErrors.city) : undefined}
            onChange={onCityChange}
          />
          <div
            className="ticket-line-row"
            role="group"
            aria-label={t("search.distanceGroup")}
          >
            {distanceOptions.map((option) => {
              const selected = distanceFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="stamp"
                  data-on={selected}
                  data-testid={`distance-${option.value}`}
                  aria-pressed={selected}
                  onClick={() =>
                    onDistanceFilterChange(selected ? "all" : option.value)
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {suburban ? (
            <p className="font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase">
              {t("search.suburbanHint")}
            </p>
          ) : null}
        </div>
      </details>

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
