"use client";

import { useEffect, useState } from "react";
import { startOfLocalDay, toLocalDateTimeValue } from "@/lib/format";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useI18n } from "@/i18n/provider";
import { splitDateTime } from "../lib/datetime";
import { EmptyBoard, SearchingBoard, StationClock } from "./Board";
import { HowToButton } from "./HowToUse";
import { JourneyResults } from "./JourneyResults";
import { PrintTicket } from "./PrintTicket";
import { RouteMap } from "./RouteMap";
import { SearchForm } from "./SearchForm";
import { useHallTour } from "../hooks/use-hall-tour";
import { useJourneySearch } from "../hooks/use-journey-search";

export function JourneySearch() {
  const search = useJourneySearch();
  const { t } = useI18n();
  const startTour = useHallTour({
    onShowMap: () => search.revealMap(),
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

  return (
    <>
    <div className="no-print flex h-dvh flex-col overflow-hidden">
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

      <main className="hall-body">
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
            onSearch={search.handleSearch}
            onClear={search.handleClearForm}
            onReturn={search.handleReturn}
            geoBusy={search.geoBusy}
            geoError={search.geoError}
            onUseMyLocation={search.handleUseMyLocation}
          />

          {search.error && (
            <p
              role="alert"
              className="fault-note px-3 py-2.5 text-sm"
            >
              {t(search.error)}
            </p>
          )}

          {search.loading && search.itineraries.length === 0 && (
            <SearchingBoard />
          )}

          {!search.loading && search.itineraries.length === 0 && !search.error && (
            <EmptyBoard
              hasSearched={search.hasSearched}
              kicker={t(search.emptyCopy.kicker)}
              title={t(search.emptyCopy.title)}
              body={t(search.emptyCopy.body)}
              recents={search.recents}
              onRecentSelect={search.handleRecentSelect}
              onTour={startTour}
            />
          )}

          {search.itineraries.length > 0 && (
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
            />
          )}
          </div>
        </section>

        <section className="hall-map">
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
            onPickModeChange={search.setPickMode}
            onMapClick={search.handleMapClick}
            onMarkerDrag={search.handleMarkerDrag}
            onAssignPending={search.assignPendingPick}
          />
        </section>
      </main>

      <footer className="shrink-0 border-t border-rule px-4 py-3 text-center text-[11px] leading-5 text-ink-muted sm:px-6">
        <HowToButton onOpen={startTour} />
        <span className="mx-2 text-rule-strong" aria-hidden="true">
          ·
        </span>
        {t("footer.printedFrom")}{" "}
        <a
          href="https://transitous.org/sources/"
          className="text-ink underline decoration-rule-strong underline-offset-2 hover:text-signal"
          target="_blank"
          rel="noreferrer"
        >
          {t("footer.sources")}
        </a>
        . {t("footer.mapCopyright")}{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="text-ink underline decoration-rule-strong underline-offset-2 hover:text-signal"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        {t("footer.contributors")}
      </footer>
    </div>
    {search.selected ? (
      <PrintTicket
        itinerary={search.selected}
        from={search.from}
        to={search.to}
      />
    ) : null}
    </>
  );
}
