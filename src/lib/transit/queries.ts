import { unwrapAction } from "@/lib/action-result";
import { geocodeAction, reverseGeocodeAction } from "@/app/actions/geocode";
import { planJourneyAction } from "@/app/actions/plan";
import { getStopTimesAction } from "@/app/actions/stoptimes";
import { getTripAction } from "@/app/actions/trip";
import { createTtlCache } from "@/lib/ttl-cache";
import type {
  GeocodeMatch,
  Itinerary,
  ModeFilter,
  PlanResponse,
  SelectedPlace,
  StopTimesResponse,
  TransferFilter,
} from "@/lib/transit/types";

const geocodeCache = createTtlCache<GeocodeMatch[]>({
  ttlMs: 180_000,
  max: 80,
});
const planCache = createTtlCache<PlanResponse>({ ttlMs: 90_000, max: 24 });
const tripCache = createTtlCache<Itinerary>({ ttlMs: 300_000, max: 48 });
const stopTimesCache = createTtlCache<StopTimesResponse>({ ttlMs: 45_000, max: 24 });

function placeKey(place: SelectedPlace) {
  if (place.type === "STOP" && place.id) return place.id;
  return `${place.lat.toFixed(5)},${place.lon.toFixed(5)}`;
}

function planCacheKey(input: {
  from: SelectedPlace;
  to: SelectedPlace;
  via?: SelectedPlace[];
  time?: string;
  arriveBy?: boolean;
  allDay?: boolean;
  modeFilter: ModeFilter;
  transferFilter: TransferFilter;
  accessible?: boolean;
  bike?: boolean;
  night?: boolean;
  language?: string;
}) {
  const via = (input.via ?? []).map(placeKey).join(">");
  const when = input.allDay
    ? `day:${input.time?.slice(0, 10) ?? ""}`
    : input.time
      ? `at:${input.time}`
      : `now:${Math.floor(Date.now() / 25_000)}`;
  return [
    placeKey(input.from),
    placeKey(input.to),
    via,
    when,
    input.arriveBy ? "1" : "0",
    input.allDay ? "1" : "0",
    input.modeFilter,
    input.transferFilter,
    input.accessible ? "1" : "0",
    input.bike ? "1" : "0",
    input.night ? "1" : "0",
    input.language ?? "",
  ].join("|");
}

export async function searchPlaces(
  query: string,
  language?: string,
  bias?: { lat: number; lon: number } | null,
): Promise<GeocodeMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const near =
    bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lon)
      ? `${bias.lat.toFixed(3)},${bias.lon.toFixed(3)}`
      : "";
  return geocodeCache.get(
    `${language ?? ""}|${near}|${trimmed.toLowerCase()}`,
    async () =>
      unwrapAction(
        await geocodeAction({
          query: trimmed,
          language,
          lat: bias?.lat,
          lon: bias?.lon,
        }),
      ),
  );
}

export async function reverseGeocodePlace(input: {
  lat: number;
  lon: number;
  preferStop?: boolean;
  language?: string;
}): Promise<GeocodeMatch[]> {
  const key = `rev|${input.language ?? ""}|${input.preferStop ? "1" : "0"}|${input.lat.toFixed(4)},${input.lon.toFixed(4)}`;
  return geocodeCache.get(key, async () =>
    unwrapAction(await reverseGeocodeAction(input)),
  );
}

export async function planJourney(
  input: {
    from: SelectedPlace;
    to: SelectedPlace;
    via?: SelectedPlace[];
    time?: string;
    arriveBy?: boolean;
    allDay?: boolean;
    modeFilter: ModeFilter;
    transferFilter: TransferFilter;
    accessible?: boolean;
    bike?: boolean;
    night?: boolean;
    language?: string;
  },
  options?: { fresh?: boolean },
): Promise<PlanResponse> {
  return planCache.get(
    planCacheKey(input),
    async () =>
      unwrapAction(await planJourneyAction({ ...input, fresh: options?.fresh })),
    options,
  );
}

export async function fetchTrip(tripId: string): Promise<Itinerary> {
  return tripCache.get(tripId, async () =>
    unwrapAction(await getTripAction({ tripId })),
  );
}

function stopTimesCacheKey(input: {
  stop: SelectedPlace;
  time?: string;
  arriveBy?: boolean;
  modeFilter?: ModeFilter;
  night?: boolean;
  pageCursor?: string;
  language?: string;
}) {
  const when = input.time
    ? `at:${input.time}`
    : `now:${Math.floor(Date.now() / 25_000)}`;
  return [
    placeKey(input.stop),
    when,
    input.arriveBy ? "1" : "0",
    input.modeFilter ?? "all",
    input.night ? "1" : "0",
    input.pageCursor ?? "",
    input.language ?? "",
  ].join("|");
}

export async function fetchStopTimes(
  input: {
    stop: SelectedPlace;
    time?: string;
    arriveBy?: boolean;
    modeFilter?: ModeFilter;
    night?: boolean;
    pageCursor?: string;
    language?: string;
  },
  options?: { fresh?: boolean },
): Promise<StopTimesResponse> {
  return stopTimesCache.get(
    stopTimesCacheKey(input),
    async () => unwrapAction(await getStopTimesAction(input)),
    options,
  );
}
