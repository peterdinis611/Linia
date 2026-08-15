"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { itineraryMatchesCarriers } from "@/lib/carriers";
import { startOfLocalDay, toLocalDateTimeValue } from "@/lib/format";
import { useI18n } from "@/i18n/provider";
import {
  fieldErrorsFromZod,
  journeySearchFormSchema,
  type JourneyFormFieldErrors,
} from "@/lib/schemas";
import { coordPlace, matchToPlace, MAX_VIA_STOPS } from "@/lib/transit/place";
import {
  type Itinerary,
  type ModeFilter,
  type SelectedPlace,
  type TransferFilter,
} from "@/lib/transit/types";
import { planJourney, reverseGeocodePlace } from "@/lib/transit/queries";
import {
  countTransferKinds,
  emptyBoardCopy,
  indexItineraries,
  itineraryMatchesTransfers,
} from "../lib/filters";
import {
  encodeShareQuery,
  findItineraryIndex,
  itineraryKey,
  parseShareQuery,
  shareUrlFromSnapshot,
  snapshotForShare,
  type ShareSnapshot,
} from "../lib/share";
import {
  nextPickAfter,
  placesAfterPin,
  roleForMapClick,
  type MapPickMode,
  type PinRole,
} from "../lib/pins";
import {
  readRecentSearches,
  rememberSearch,
  subscribeRecentSearches,
  type RecentSearch,
} from "../lib/recent";

export type { MapPickMode } from "../lib/pins";
export type PlaceSource = "form" | "map";
export type RouteMode = "point" | "via";

function planKey(input: {
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
  leaveNow: boolean;
  datetime: string;
  arriveBy: boolean;
  allDay: boolean;
  modeFilter: ModeFilter;
  transferFilter: TransferFilter;
}) {
  if (!input.from || !input.to) return "";
  if (input.via.some((stop) => !stop)) return "";
  return [
    input.from.id,
    input.to.id,
    input.via.map((stop) => stop!.id).join(","),
    input.allDay
      ? `day:${input.datetime.slice(0, 10)}`
      : input.leaveNow
        ? "now"
        : input.datetime,
    input.arriveBy ? "1" : "0",
    input.modeFilter,
    input.transferFilter,
  ].join("|");
}

export function useJourneySearch() {
  const { locale } = useI18n();
  const [from, setFrom] = useState<SelectedPlace | null>(null);
  const [to, setTo] = useState<SelectedPlace | null>(null);
  const [via, setVia] = useState<Array<SelectedPlace | null>>([]);
  const [routeMode, setRouteMode] = useState<RouteMode>("point");
  const [leaveNow, setLeaveNow] = useState(true);
  const [datetime, setDatetime] = useState(toLocalDateTimeValue);
  const [arriveBy, setArriveBy] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [transferFilter, setTransferFilter] = useState<TransferFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<JourneyFormFieldErrors>({});
  const [mapFitKey, setMapFitKey] = useState(0);
  const [pickMode, setPickMode] = useState<MapPickMode>("idle");
  const [pendingPick, setPendingPick] = useState<SelectedPlace | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveAt, setLiveAt] = useState<number | null>(null);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const hydratedShare = useRef(false);
  const lastPlan = useRef<ShareSnapshot | null>(null);
  const selectedRef = useRef<Itinerary | null>(null);
  const claimedPlan = useRef("");
  const pinBusyRef = useRef(false);
  const planGen = useRef(0);

  const transferCounts = useMemo(
    () => countTransferKinds(itineraries),
    [itineraries],
  );

  const afterTransfers = useMemo(
    () =>
      indexItineraries(itineraries).filter(({ itinerary }) =>
        itineraryMatchesTransfers(itinerary, transferFilter),
      ),
    [itineraries, transferFilter],
  );

  const filtered = useMemo(
    () =>
      afterTransfers.filter(({ itinerary }) =>
        itineraryMatchesCarriers(itinerary, selectedCarriers),
      ),
    [afterTransfers, selectedCarriers],
  );

  const selected =
    filtered.find((item) => item.index === selectedIndex)?.itinerary ??
    filtered[0]?.itinerary ??
    null;
  selectedRef.current = selected;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((item) => item.index === selectedIndex)) {
      setSelectedIndex(filtered[0].index);
    }
  }, [filtered, selectedIndex]);

  const emptyCopy = useMemo(
    () => emptyBoardCopy(hasSearched),
    [hasSearched],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || itineraries.length === 0) return "";
    const base = lastPlan.current;
    if (!base) return "";
    const snapshot = snapshotForShare({ ...base, selected });
    return snapshot ? shareUrlFromSnapshot(snapshot) : "";
  }, [itineraries, selected]);

  function bumpFit() {
    setMapFitKey((key) => key + 1);
  }

  function clearPlaceErrors() {
    setFieldErrors((errors) => ({ ...errors, from: undefined, to: undefined }));
  }

  function resetResults() {
    setItineraries([]);
    setSelectedIndex(0);
    setSelectedCarriers([]);
    setHasSearched(false);
    setError(null);
  }

  function handleFromChange(place: SelectedPlace | null, _source: PlaceSource = "form") {
    setFrom(place);
    clearPlaceErrors();
    setPendingPick(null);
    if (place) bumpFit();
  }

  function handleToChange(place: SelectedPlace | null, _source: PlaceSource = "form") {
    setTo(place);
    clearPlaceErrors();
    setPendingPick(null);
    if (place) bumpFit();
  }

  function handleViaChange(index: number, place: SelectedPlace | null) {
    if (place) setRouteMode("via");
    setVia((current) => current.map((stop, i) => (i === index ? place : stop)));
    setFieldErrors((errors) => {
      const next = { ...errors };
      delete next[`via.${index}`];
      delete next.via;
      return next;
    });
    if (place) bumpFit();
  }

  function applyMapPlace(role: PinRole, place: SelectedPlace) {
    const next = placesAfterPin(role, place, { from, to, via });
    if (role === "from") {
      setFrom(place);
      clearPlaceErrors();
    } else if (role === "to") {
      setTo(place);
      clearPlaceErrors();
    } else {
      setRouteMode("via");
      setVia(next.via);
      setFieldErrors((errors) => {
        const cleared = { ...errors };
        delete cleared.via;
        delete cleared["via.0"];
        delete cleared["via.1"];
        return cleared;
      });
    }
    setPendingPick(null);
    const nextMode = nextPickAfter(role, next);
    setPickMode(nextMode);
    if (nextMode === "idle") bumpFit();
  }

  function handlePickModeChange(mode: MapPickMode) {
    if (mode === "idle" || mode === pickMode) {
      setPickMode("idle");
      return;
    }
    if (mode === "via") {
      setRouteMode("via");
      setVia((current) => (current.length === 0 ? [null] : current));
    }
    if (pendingPick) {
      applyMapPlace(mode, pendingPick);
      return;
    }
    setPickMode(mode);
  }

  function handleRouteModeChange(mode: RouteMode) {
    setRouteMode(mode);
    if (mode === "point") {
      setVia([]);
      if (pickMode === "via") setPickMode("idle");
      setFieldErrors((errors) => {
        const next = { ...errors };
        delete next.via;
        delete next["via.0"];
        delete next["via.1"];
        return next;
      });
    } else if (via.length === 0) {
      setVia([null]);
    }
  }

  function handleAddVia() {
    setRouteMode("via");
    setVia((current) =>
      current.length >= MAX_VIA_STOPS ? current : [...current, null],
    );
  }

  function handleRemoveVia(index: number) {
    const next = via.filter((_, i) => i !== index);
    setVia(next);
    if (next.length === 0) setRouteMode("point");
  }

  function handleSwap() {
    setFrom(to);
    setTo(from);
    setVia((current) => [...current].reverse());
    clearPlaceErrors();
    if (from || to) bumpFit();
  }

  function handleReturn() {
    const current = selectedRef.current;
    setFrom(to);
    setTo(from);
    setVia((currentVia) => [...currentVia].reverse());
    clearPlaceErrors();
    if (from || to) bumpFit();
    if (current) {
      const leave = new Date(
        new Date(current.endTime).getTime() + 30 * 60 * 1000,
      );
      setLeaveNow(false);
      setArriveBy(false);
      setAllDay(false);
      setDatetime(toLocalDateTimeValue(leave));
    }
  }

  function writeShareUrl(query: string) {
    if (typeof window === "undefined") return;
    const next = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
    setShareQuery(query ? `?${query}` : "");
  }

  function applySnapshot(snapshot: ShareSnapshot) {
    setFrom(snapshot.from);
    setTo(snapshot.to);
    setVia(snapshot.via);
    setRouteMode(snapshot.via.length > 0 ? "via" : "point");
    setLeaveNow(snapshot.leaveNow);
    setDatetime(snapshot.datetime);
    setArriveBy(snapshot.arriveBy);
    setAllDay(snapshot.allDay);
    setModeFilter(snapshot.modeFilter);
    setTransferFilter(snapshot.transferFilter);
  }

  async function runPlan(
    snapshot: {
      from: SelectedPlace | null;
      to: SelectedPlace | null;
      via: Array<SelectedPlace | null>;
      leaveNow: boolean;
      datetime: string;
      arriveBy: boolean;
      allDay: boolean;
      modeFilter: ModeFilter;
      transferFilter: TransferFilter;
      tripKey?: string;
    },
    options?: { silent?: boolean; fresh?: boolean },
  ) {
    const key = planKey(snapshot);
    if (key) claimedPlan.current = key;

    const parsed = journeySearchFormSchema.safeParse({
      from: snapshot.from,
      to: snapshot.to,
      via: snapshot.via,
      time: snapshot.datetime,
      leaveNow: snapshot.leaveNow,
      arriveBy: snapshot.arriveBy,
      allDay: snapshot.allDay,
      modeFilter: snapshot.modeFilter,
      transferFilter: snapshot.transferFilter,
    });

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      setError(null);
      return;
    }

    const origin = parsed.data.from;
    const destination = parsed.data.to;
    if (!origin || !destination) return;
    const vias = parsed.data.via.filter(
      (stop): stop is SelectedPlace => Boolean(stop),
    );
    const silent = Boolean(options?.silent);
    const gen = ++planGen.current;

    setFieldErrors({});
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setHasSearched(true);
    setPendingPick(null);
    try {
      const result = await planJourney(
        {
          from: origin,
          to: destination,
          via: vias,
          time: parsed.data.leaveNow
            ? undefined
            : parsed.data.allDay
              ? startOfLocalDay(parsed.data.time ?? snapshot.datetime)
              : parsed.data.time,
          arriveBy: parsed.data.allDay ? false : parsed.data.arriveBy,
          allDay: parsed.data.allDay,
          modeFilter: parsed.data.modeFilter,
          transferFilter: parsed.data.transferFilter,
          language: locale,
        },
        { fresh: options?.fresh },
      );
      if (gen !== planGen.current) return;
      const journeys = [
        ...(result.itineraries ?? []),
        ...(result.direct ?? []),
      ];
      lastPlan.current = {
        from: origin,
        to: destination,
        via: vias,
        leaveNow: parsed.data.leaveNow,
        datetime: parsed.data.time ?? snapshot.datetime,
        arriveBy: parsed.data.arriveBy,
        allDay: parsed.data.allDay,
        modeFilter: parsed.data.modeFilter,
        transferFilter: parsed.data.transferFilter,
        tripKey: snapshot.tripKey,
      };
      setItineraries(journeys);
      setSelectedIndex(findItineraryIndex(journeys, snapshot.tripKey));
      if (!silent) {
        setSelectedCarriers([]);
        setRecents(
          await rememberSearch({ from: origin, to: destination, via: vias }),
        );
      }
      setLiveAt(Date.now());
      bumpFit();
    } catch (err) {
      if (gen !== planGen.current) return;
      if (!silent) {
        setItineraries([]);
        setError(
          err instanceof Error &&
            (err.message.startsWith("errors.") ||
              err.message.startsWith("validation."))
            ? err.message
            : "errors.searchFailed",
        );
      }
    } finally {
      if (gen === planGen.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (hydratedShare.current) return;
    hydratedShare.current = true;
    const snapshot = parseShareQuery(window.location.search);
    if (!snapshot) {
      setShareQuery(window.location.search);
      return;
    }
    applySnapshot(snapshot);
    setShareQuery(window.location.search);
    void runPlan(snapshot);
    // Restore a public link once on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only share restore
  }, []);

  useEffect(() => {
    const base = lastPlan.current;
    if (!base || itineraries.length === 0) return;
    const snapshot = snapshotForShare({
      from: base.from,
      to: base.to,
      via: base.via,
      leaveNow: base.leaveNow,
      datetime: base.datetime,
      arriveBy: base.arriveBy,
      allDay: base.allDay,
      modeFilter: base.modeFilter,
      transferFilter: base.transferFilter,
      selected,
    });
    if (!snapshot) return;
    writeShareUrl(encodeShareQuery(snapshot));
  }, [itineraries, selected]);

  function handleClearForm() {
    setFrom(null);
    setTo(null);
    setVia([]);
    setRouteMode("point");
    setLeaveNow(true);
    setDatetime(toLocalDateTimeValue());
    setArriveBy(false);
    setAllDay(false);
    setModeFilter("all");
    setTransferFilter("all");
    setFieldErrors({});
    setPickMode("idle");
    setPendingPick(null);
    resetResults();
    lastPlan.current = null;
    claimedPlan.current = "";
    writeShareUrl("");
    setLiveAt(null);
    setGeoError(null);
  }

  async function lookupPlace(lat: number, lon: number, preferStop: boolean) {
    try {
      const matches = await reverseGeocodePlace({
        lat,
        lon,
        preferStop,
        language: locale,
      });
      if (matches[0]) return matchToPlace(matches[0], locale);
    } catch {
      // fall through to coordinate pin
    }
    return coordPlace(lat, lon);
  }

  async function handleMapClick(lat: number, lon: number) {
    if (pinBusyRef.current) return;
    pinBusyRef.current = true;
    setPinBusy(true);
    try {
      const role = roleForMapClick(pickMode, { from, to, via });
      const place = await lookupPlace(lat, lon, role === "via");
      if (role === "pending") {
        setPendingPick(place);
        return;
      }
      applyMapPlace(role, place);
    } finally {
      pinBusyRef.current = false;
      setPinBusy(false);
    }
  }

  function assignPendingPick(role: PinRole) {
    if (!pendingPick) return;
    applyMapPlace(role, pendingPick);
  }

  async function handleMarkerDrag(
    role: "from" | "to" | `via.${number}`,
    lat: number,
    lon: number,
  ) {
    const place = await lookupPlace(lat, lon, role.startsWith("via"));
    if (role === "from") handleFromChange(place, "map");
    else if (role === "to") handleToChange(place, "map");
    else handleViaChange(Number(role.slice(4)), place);
  }

  async function handleSearch() {
    await runPlan({
      from,
      to,
      via: routeMode === "via" ? via : [],
      leaveNow,
      datetime,
      arriveBy,
      allDay,
      modeFilter,
      transferFilter,
    });
  }

  useEffect(() => {
    const snapshot = {
      from,
      to,
      via: routeMode === "via" ? via : [],
      leaveNow,
      datetime,
      arriveBy,
      allDay,
      modeFilter,
      transferFilter,
    };
    const key = planKey(snapshot);
    if (!key || key === claimedPlan.current) return;
    if (pickMode !== "idle") return;
    const timer = window.setTimeout(() => {
      void runPlan(snapshot);
    }, 280);
    return () => window.clearTimeout(timer);
    // runPlan reads the snapshot captured here; claimedPlan prevents a second trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    pickMode,
  ]);

  useEffect(() => {
    let cancelled = false;
    const apply = (items: RecentSearch[]) => {
      if (!cancelled) setRecents(items);
    };
    void readRecentSearches().then(apply);
    const stop = subscribeRecentSearches(apply);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  useEffect(() => {
    if (!hasSearched || itineraries.length === 0) return;
    const id = window.setInterval(() => {
      const base = lastPlan.current;
      if (!base) return;
      const current = selectedRef.current;
      void runPlan(
        {
          ...base,
          datetime: base.allDay
            ? startOfLocalDay(base.datetime)
            : base.leaveNow
              ? toLocalDateTimeValue()
              : base.datetime,
          tripKey: current ? itineraryKey(current) : base.tripKey,
        },
        { silent: true, fresh: true },
      );
    }, 60_000);
    return () => window.clearInterval(id);
    // Interval is tied to an open result set; runPlan reads latest lastPlan/selected via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, itineraries.length]);

  function handleRefresh() {
    const base = lastPlan.current;
    if (!base) return;
    const current = selectedRef.current;
    void runPlan(
      {
        ...base,
        datetime: base.allDay
          ? startOfLocalDay(base.datetime)
          : base.leaveNow
            ? toLocalDateTimeValue()
            : base.datetime,
        tripKey: current ? itineraryKey(current) : base.tripKey,
      },
      { silent: true, fresh: true },
    );
  }

  function handleTimeShift(direction: "earlier" | "later") {
    const base = lastPlan.current;
    if (!base || itineraries.length === 0) return;
    const stamps = itineraries
      .map((item) =>
        new Date(base.arriveBy ? item.endTime : item.startTime).getTime(),
      )
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
    if (stamps.length === 0) return;
    const pivot =
      direction === "later"
        ? stamps[stamps.length - 1]! + 60_000
        : stamps[0]! - 60_000;
    const nextTime = toLocalDateTimeValue(new Date(pivot));
    setLeaveNow(false);
    setArriveBy(base.arriveBy);
    setAllDay(false);
    setDatetime(nextTime);
    void runPlan({
      ...base,
      leaveNow: false,
      datetime: nextTime,
      allDay: false,
      tripKey: undefined,
    });
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("errors.geoUnsupported");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await lookupPlace(
            position.coords.latitude,
            position.coords.longitude,
            true,
          );
          handleFromChange(place, "map");
          bumpFit();
        } catch {
          setGeoError("errors.geoFailed");
        } finally {
          setGeoBusy(false);
        }
      },
      (error) => {
        setGeoBusy(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "errors.geoDenied"
            : "errors.geoFailed",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function handleRecentSelect(item: RecentSearch) {
    setFrom(item.from);
    setTo(item.to);
    setVia(item.via);
    setRouteMode(item.via.length > 0 ? "via" : "point");
    setLeaveNow(true);
    setArriveBy(false);
    setAllDay(false);
    setDatetime(toLocalDateTimeValue());
    setModeFilter("all");
    setTransferFilter("all");
    void runPlan({
      from: item.from,
      to: item.to,
      via: item.via,
      leaveNow: true,
      datetime: toLocalDateTimeValue(),
      arriveBy: false,
      allDay: false,
      modeFilter: "all",
      transferFilter: "all",
    });
  }

  function revealMap() {
    bumpFit();
  }

  return {
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
    loading,
    error,
    hasSearched,
    itineraries,
    selectedIndex,
    selectedCarriers,
    fieldErrors,
    transferCounts,
    afterTransfers,
    filtered,
    selected,
    emptyCopy,
    mapFitKey,
    pickMode,
    pendingPick,
    pinBusy,
    geoBusy,
    geoError,
    refreshing,
    liveAt,
    recents,
    shareQuery,
    shareUrl,
    setArriveBy,
    setModeFilter,
    setTransferFilter,
    setSelectedIndex,
    setSelectedCarriers,
    setPickMode: handlePickModeChange,
    handlePickModeChange,
    handleFromChange,
    handleToChange,
    handleViaChange,
    handleAddVia,
    handleRemoveVia,
    handleRouteModeChange,
    handleSwap,
    handleReturn,
    handleClearForm,
    handleSearch,
    handleRefresh,
    handleTimeShift,
    handleUseMyLocation,
    handleRecentSelect,
    revealMap,
    handleMapClick,
    handleMarkerDrag,
    assignPendingPick,
    setLeaveNow,
    setDatetime,
    setAllDay,
    setFieldErrors,
  };
}
