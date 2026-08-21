import { unwrapAction } from "@/lib/action-result";
import { geocodeAction, reverseGeocodeAction } from "@/app/actions/geocode";
import { planJourneyAction } from "@/app/actions/plan";
import { getStopTimesAction } from "@/app/actions/stoptimes";
import { getTripAction } from "@/app/actions/trip";
import { createTtlCache } from "@/lib/ttl-cache";
import { hasMappableCoords } from "@/lib/transit/geocode-rank";
import { matchToPlace } from "@/lib/transit/place";
import { boardDestinationName, boardDestinations } from "@/lib/transit/path";
import type {
  DistanceFilter,
  GeocodeMatch,
  Itinerary,
  ModeFilter,
  PlanResponse,
  SelectedPlace,
  StopTimeEvent,
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
  distanceFilter?: DistanceFilter;
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
    input.distanceFilter ?? "all",
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
  options?: { type?: "PLACE" | "STOP"; placeBias?: number },
): Promise<GeocodeMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const near =
    bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lon)
      ? `${bias.lat.toFixed(3)},${bias.lon.toFixed(3)}`
      : "";
  return geocodeCache.get(
    `${language ?? ""}|${near}|${options?.type ?? ""}|${options?.placeBias ?? ""}|${trimmed.toLowerCase()}`,
    async () =>
      unwrapAction(
        await geocodeAction({
          query: trimmed,
          language,
          lat: bias?.lat,
          lon: bias?.lon,
          type: options?.type,
          placeBias: options?.placeBias,
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
    distanceFilter?: DistanceFilter;
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
  distanceFilter?: DistanceFilter;
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
    input.distanceFilter ?? "all",
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
    distanceFilter?: DistanceFilter;
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

export async function resolveBoardEnds(
  events: StopTimeEvent[],
  bias: { lat: number; lon: number } | null,
  language?: string,
): Promise<SelectedPlace[]> {
  const mapped = boardDestinations(events);
  const covered = new Set(mapped.map((place) => place.name.toLowerCase()));
  const names: string[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const name = boardDestinationName(event);
    const key = name.toLowerCase();
    if (name.length < 2 || seen.has(key) || covered.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  if (mapped.length > 0 && names.length === 0) return mapped;

  const found: SelectedPlace[] = [...mapped];
  const used = new Set(
    mapped.map(
      (place) => place.id || `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
    ),
  );
  for (const name of names.slice(0, 8)) {
    const matches = await searchPlaces(name, language, bias, { placeBias: 3 });
    const stop = matches.find(
      (match) =>
        match.type === "STOP" && hasMappableCoords(match.lat, match.lon),
    );
    if (!stop) continue;
    const key = stop.id || `${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`;
    if (used.has(key)) continue;
    used.add(key);
    found.push(matchToPlace(stop));
  }
  return found;
}
