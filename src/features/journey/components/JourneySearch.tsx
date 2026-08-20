"use client";

import { useEffect, useState } from "react";
import { startOfLocalDay, toLocalDateTimeValue } from "@/lib/format";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useI18n } from "@/i18n/provider";
import { splitDateTime } from "../lib/datetime";
import { EmptyBoard, SearchingBoard, StationClock } from "./Board";
import { HowToButton } from "./HowToUse";
import { ItineraryDetail } from "./ItineraryDetail";
import { JourneyResults } from "./JourneyResults";
import { PinLine } from "./PinLine";
import { PrintTicket } from "./PrintTicket";
import { RouteMap } from "./RouteMap";
import { SearchForm } from "./SearchForm";
import { StationBoard } from "./StationBoard";
import { useHallTour } from "../hooks/use-hall-tour";
import { useJourneySearch } from "../hooks/use-journey-search";

export function JourneySearch() {
  const search = useJourneySearch();
  const { t } = useI18n();
  const [mapOpen, setMapOpen] = useState(false);
  const startTour = useHallTour({
    onShowMap: () => {
      setMapOpen(true);
      search.revealMap();
    },
    onShowBoard: () => {
      document
        .querySelector("[data-tour='board']")
        ?.scrollIntoView({ block: "nearest" });
    },
  });
  const [now, setNow] = useState(() => Date.now());
  const liveFresh = Boolean(
    search.liveAt && now - search.liveAt < 90_000,
  );

  useEffect(() => {
    if (!search.liveAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [search.liveAt]);

  useEffect(() => {
    if (search.pickMode !== "idle") setMapOpen(true);
  }, [search.pickMode]);

  return (
    <>
    <div className="hall-shell no-print flex h-dvh flex-col overflow-hidden">
      <div className="signal-bar shrink-0" aria-hidden="true" />

      <header data-tour="hall" className="shrink-0 border-b border-rule px-4 py-4 sm:px-6">
        <div className="hall-mast">
          <div className="hall-mast-brand reveal">
            <p className="kicker">{t("brand.kicker")}</p>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="font-display text-[2.15rem] leading-none font-semibold tracking-tight italic sm:text-[2.6rem]">
                Linia
              </h1>
              <span
                className={`mb-1 inline-block h-2.5 w-2.5 rounded-full ${
                  liveFresh ? "live-lamp bg-signal" : "bg-ink-muted opacity-40"
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="desk-strip">
            <LanguageSwitcher search={search.shareQuery} />
            <ThemeSwitcher />
          </div>
          <StationClock />
        </div>
      </header>

      <main className="hall-body" data-map={mapOpen ? "open" : "pocket"}>
        <section className="panel-scroll min-h-0 min-w-0 overflow-x-hidden overflow-y-auto border-rule p-4 sm:p-6 lg:border-r">
          <div className="flex flex-col gap-6">
            <SearchForm
            from={search.from}
            to={search.to}
            via={search.via}
            routeMode={search.routeMode}
            leaveNow={search.leaveNow}
            datetime={search.datetime}
            arriveBy={search.arriveBy}
            allDay={search.allDay}
            modeFilter={search.modeFilter}
            transferFilter={search.transferFilter}
            accessible={search.accessible}
            bike={search.bike}
            night={search.night}
            wantReturn={search.wantReturn}
            returnDatetime={search.returnDatetime}
            loading={search.loading}
            hasSearched={search.hasSearched}
            transferCounts={search.transferCounts}
            fieldErrors={search.fieldErrors}
            onFromChange={search.handleFromChange}
            onToChange={search.handleToChange}
            onViaChange={search.handleViaChange}
            onAddVia={search.handleAddVia}
            onRemoveVia={search.handleRemoveVia}
            onRouteModeChange={search.handleRouteModeChange}
            onSwap={search.handleSwap}
            onLeaveNowChange={(value) => {
              search.setLeaveNow(value);
              if (value) {
                search.setArriveBy(false);
                search.setAllDay(false);
                search.setFieldErrors((errors) => ({
                  ...errors,
                  time: undefined,
                }));
              } else {
                search.setDatetime(toLocalDateTimeValue());
              }
            }}
            onDatetimeChange={(value) => {
              const previous = splitDateTime(search.datetime);
              const next = splitDateTime(value);
              search.setDatetime(value);
              search.setLeaveNow(false);
              if (previous.hour !== next.hour || previous.minute !== next.minute) {
                search.setAllDay(false);
              }
              search.setFieldErrors((errors) => ({
                ...errors,
                time: undefined,
              }));
            }}
            onArriveByChange={(value) => {
              search.setArriveBy(value);
              if (value) {
                search.setLeaveNow(false);
                search.setAllDay(false);
              }
            }}
            onAllDayChange={(value) => {
              search.setAllDay(value);
              if (value) {
                search.setLeaveNow(false);
                search.setArriveBy(false);
                search.setDatetime(startOfLocalDay(search.datetime));
              }
            }}
            onModeFilterChange={search.setModeFilter}
            onTransferFilterChange={search.setTransferFilter}
            onAccessibleChange={search.setAccessible}
            onBikeChange={search.setBike}
            onNightChange={search.setNight}
            onWantReturnChange={search.handleWantReturnChange}
            onReturnDatetimeChange={(value) => {
              search.setReturnDatetime(value);
              search.setFieldErrors((errors) => ({
                ...errors,
                returnTime: undefined,
              }));
            }}
            onSearch={search.handleSearch}
            onClear={search.handleClearForm}
            geoBusy={search.geoBusy}
            geoError={search.geoError}
            onUseMyLocation={search.handleUseMyLocation}
            onNearbyBoard={search.handleNearbyBoard}
          />

          {search.error && (
            <p
              role="alert"
              className="fault-note px-3 py-2.5 text-sm"
            >
              {t(search.error)}
            </p>
          )}

          {search.loading &&
            search.itineraries.length === 0 &&
            search.stopTimes.length === 0 && <SearchingBoard />}

          {!search.loading &&
            search.itineraries.length === 0 &&
            search.stopTimes.length === 0 &&
            !search.error && (
            <EmptyBoard
              hasSearched={search.hasSearched}
              kicker={t(search.emptyCopy.kicker)}
              title={t(search.emptyCopy.title)}
              body={t(search.emptyCopy.body)}
              recents={search.recents}
              pins={search.pins}
              onRecentSelect={search.handleRecentSelect}
              onPinnedSelect={search.handlePinnedSelect}
              onTour={startTour}
            />
          )}

          {search.routeMode === "board" && search.stopTimes.length > 0 && (
            <div
              data-testid="station-board-panel"
              data-tour="board"
              className="space-y-4"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="kicker">{t("board.stationKicker")}</p>
                  <p className="font-display mt-1 text-xl italic">
                    {search.arriveBy
                      ? t("board.stationArrivals")
                      : t("board.stationDepartures")}
                  </p>
                </div>
                <button
                  type="button"
                  className="stamp"
                  data-testid="refresh-live"
                  onClick={search.handleRefresh}
                  disabled={search.refreshing || search.loading}
                >
                  {t("results.refresh")}
                </button>
              </div>
              <div className="mode-switch" data-cols="2" role="group">
                <button
                  type="button"
                  data-testid="earlier-connections"
                  disabled={search.loading || search.refreshing}
                  onClick={() => search.handleTimeShift("earlier")}
                >
                  {t("results.earlier")}
                </button>
                <button
                  type="button"
                  data-testid="later-connections"
                  disabled={search.loading || search.refreshing}
                  onClick={() => search.handleTimeShift("later")}
                >
                  {t("results.later")}
                </button>
              </div>
              <StationBoard
                stopTimes={search.stopTimes}
                arriveBy={search.arriveBy}
                selectedTripId={search.boardTrip?.legs.find((leg) => leg.tripId)?.tripId}
                onSelect={search.handleSelectStopTime}
              />
              {search.boardTrip ? (
                <ItineraryDetail
                  itinerary={search.boardTrip}
                  onOpenStation={search.handleOpenStation}
                />
              ) : null}
            </div>
          )}

          {search.routeMode !== "board" && search.itineraries.length > 0 && (
            <>
              {search.from && search.to ? (
                <PinLine
                  from={search.from}
                  to={search.to}
                  via={(search.routeMode === "via" ? search.via : []).filter(
                    (stop): stop is NonNullable<typeof stop> => Boolean(stop),
                  )}
                  pins={search.pins}
                  onPin={search.handlePinSearch}
                  onUnpin={search.handleUnpinSearch}
                />
              ) : null}
              {search.wantReturn && search.inboundItineraries.length > 0 ? (
                <div
                  className="mode-switch"
                  data-cols="2"
                  role="group"
                  aria-label={t("search.returnTrip")}
                >
                  <button
                    type="button"
                    data-on={search.hallLeg === "outbound"}
                    aria-pressed={search.hallLeg === "outbound"}
                    data-testid="hall-leg-outbound"
                    onClick={() => search.setHallLeg("outbound")}
                  >
                    {t("search.outbound")}
                  </button>
                  <button
                    type="button"
                    data-on={search.hallLeg === "inbound"}
                    aria-pressed={search.hallLeg === "inbound"}
                    data-testid="hall-leg-inbound"
                    onClick={() => search.setHallLeg("inbound")}
                  >
                    {t("search.inbound")}
                  </button>
                </div>
              ) : null}
              <JourneyResults
                loading={search.loading}
                itineraries={search.itineraries}
                afterTransfers={search.afterTransfers}
                filtered={search.filtered}
                selected={search.selected}
                selectedIndex={search.selectedIndex}
                selectedCarriers={search.selectedCarriers}
                transferFilter={search.transferFilter}
                shareUrl={search.shareUrl}
                refreshing={search.refreshing}
                liveAt={search.liveAt}
                liveFresh={liveFresh}
                onSelectedCarriersChange={search.setSelectedCarriers}
                onSelectedIndexChange={search.setSelectedIndex}
                onTransferFilterChange={search.setTransferFilter}
                onRefresh={search.handleRefresh}
                onTimeShift={search.allDay ? undefined : search.handleTimeShift}
                onOpenStation={search.handleOpenStation}
              />
            </>
          )}
          </div>
        </section>

        <section className="hall-map" data-tour="map">
          <RouteMap
            itinerary={search.selected}
            from={search.from}
            to={search.to}
            via={search.via}
            routeMode={search.routeMode}
            highlightCarriers={search.selectedCarriers}
            fitKey={search.mapFitKey}
            pickMode={search.pickMode}
            pendingPick={search.pendingPick}
            pinBusy={search.pinBusy}
            pocketed={!mapOpen}
            onTogglePocket={() => {
              if (mapOpen) {
                search.setPickMode("idle");
                setMapOpen(false);
                return;
              }
              setMapOpen(true);
              search.revealMap();
            }}
            onPickModeChange={search.setPickMode}
            onMapClick={search.handleMapClick}
            onMarkerDrag={search.handleMarkerDrag}
            onAssignPending={search.assignPendingPick}
          />
        </section>
      </main>

      <footer className="hall-foot">
        <p className="hall-foot-nav">
          <HowToButton onOpen={startTour} />
          <span className="hall-foot-dot" aria-hidden="true">
            ·
          </span>
          {t("footer.printedFrom")}{" "}
          <a
            href="https://transitous.org/sources/"
            className="hall-foot-link"
            target="_blank"
            rel="noreferrer"
          >
            {t("footer.sources")}
          </a>
        </p>
        <p className="hall-foot-legal">
          {t("footer.mapCopyright")}{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            className="hall-foot-link"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          {t("footer.contributors")}
        </p>
      </footer>
    </div>
    {search.routeMode === "board" && search.selected ? (
      <PrintTicket
        itinerary={search.selected}
        from={search.from}
        to={search.to}
      />
    ) : null}
    {search.routeMode !== "board" && search.outboundSelected ? (
      <PrintTicket
        itinerary={search.outboundSelected}
        from={search.from}
        to={search.to}
      />
    ) : null}
    {search.routeMode !== "board" &&
    search.wantReturn &&
    search.returnSelected ? (
      <PrintTicket
        itinerary={search.returnSelected}
        from={search.to}
        to={search.from}
      />
    ) : null}
    </>
  );
}
