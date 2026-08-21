import { isTransitMode, toLocalDateTimeValue } from "@/lib/format";
import {
  distanceFilterSchema,
  modeFilterSchema,
  selectedPlaceSchema,
  transferFilterSchema,
} from "@/lib/schemas";
import type {
  DistanceFilter,
  Itinerary,
  ModeFilter,
  SelectedPlace,
  TransferFilter,
} from "@/lib/transit/types";

export type ShareSnapshot = {
  from: SelectedPlace;
  to: SelectedPlace | null;
  via: SelectedPlace[];
  leaveNow: boolean;
  datetime: string;
  arriveBy: boolean;
  allDay: boolean;
  modeFilter: ModeFilter;
  distanceFilter?: DistanceFilter;
  city?: SelectedPlace | null;
  transferFilter: TransferFilter;
  tripKey?: string;
  board?: boolean;
  accessible?: boolean;
  bike?: boolean;
  night?: boolean;
  returnDatetime?: string;
  returnTripKey?: string;
};

const PLACE_SEP = "*";

function encodePlace(place: SelectedPlace) {
  return [
    place.lat.toFixed(5),
    place.lon.toFixed(5),
    place.type,
    encodeURIComponent(place.id),
    encodeURIComponent(place.name),
    encodeURIComponent(place.area ?? ""),
  ].join(PLACE_SEP);
}

function decodePlace(value: string): SelectedPlace | null {
  const parts = value.split(PLACE_SEP);
  if (parts.length < 5) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  const parsed = selectedPlaceSchema.safeParse({
    lat,
    lon,
    type: parts[2],
    id: decodeURIComponent(parts[3] ?? ""),
    name: decodeURIComponent(parts[4] ?? ""),
    area: parts[5] ? decodeURIComponent(parts[5]) : undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function itineraryKey(itinerary: Itinerary) {
  const trips = itinerary.legs
    .filter((leg) => isTransitMode(leg.mode))
    .map((leg) => leg.tripId || `${leg.mode}:${leg.routeShortName ?? ""}`)
    .join(",");
  return `${itinerary.startTime}~${trips}`;
}

export function findItineraryIndex(itineraries: Itinerary[], key?: string) {
  if (!key || itineraries.length === 0) return 0;
  const exact = itineraries.findIndex((item) => itineraryKey(item) === key);
  if (exact >= 0) return exact;
  const trips = key.split("~")[1];
  if (!trips) return 0;
  const byTrips = itineraries.findIndex(
    (item) => itineraryKey(item).split("~")[1] === trips,
  );
  return byTrips >= 0 ? byTrips : 0;
}

export function encodeShareQuery(snapshot: ShareSnapshot) {
  const params = new URLSearchParams();
  params.set("from", encodePlace(snapshot.from));
  if (snapshot.to) params.set("to", encodePlace(snapshot.to));
  for (const stop of snapshot.via) {
    params.append("via", encodePlace(stop));
  }
  if (!snapshot.leaveNow && snapshot.datetime) {
    params.set("at", snapshot.datetime);
  }
  if (snapshot.allDay) params.set("day", "1");
  if (snapshot.arriveBy) params.set("arrive", "1");
  if (snapshot.modeFilter !== "all") params.set("mode", snapshot.modeFilter);
  if (snapshot.distanceFilter && snapshot.distanceFilter !== "all") {
    params.set("scope", snapshot.distanceFilter);
  }
  if (snapshot.city) params.set("city", encodePlace(snapshot.city));
  if (snapshot.transferFilter !== "all") {
    params.set("xfers", snapshot.transferFilter);
  }
  if (snapshot.tripKey) params.set("trip", snapshot.tripKey);
  if (snapshot.board) params.set("board", "1");
  if (snapshot.accessible) params.set("access", "1");
  if (snapshot.bike) params.set("bike", "1");
  if (snapshot.night) params.set("night", "1");
  if (snapshot.returnDatetime) params.set("back", snapshot.returnDatetime);
  if (snapshot.returnTripKey) params.set("rtrip", snapshot.returnTripKey);
  return params.toString();
}

export function flattenSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

export function parseShareQuery(
  search: string | URLSearchParams,
): ShareSnapshot | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  const from = decodePlace(params.get("from") ?? "");
  const to = decodePlace(params.get("to") ?? "");
  const board = params.get("board") === "1";
  if (!from) return null;
  if (!board && !to) return null;

  const via = params
    .getAll("via")
    .map(decodePlace)
    .filter((stop): stop is SelectedPlace => Boolean(stop))
    .slice(0, 2);

  const at = params.get("at")?.trim() ?? "";
  const datetime = at && !Number.isNaN(new Date(at).getTime()) ? at : toLocalDateTimeValue();
  const allDay = params.get("day") === "1";
  const mode = modeFilterSchema.safeParse(params.get("mode") ?? "all");
  const scope = distanceFilterSchema.safeParse(params.get("scope") ?? "all");
  const city = decodePlace(params.get("city") ?? "");
  const xfers = transferFilterSchema.safeParse(params.get("xfers") ?? "all");
  const tripKey = params.get("trip")?.trim() || undefined;
  const back = params.get("back")?.trim() ?? "";
  const returnDatetime =
    back && !Number.isNaN(new Date(back).getTime()) ? back : undefined;

  return {
    from,
    to,
    via,
    leaveNow: !at && !allDay,
    datetime,
    arriveBy: params.get("arrive") === "1",
    allDay,
    modeFilter: mode.success ? mode.data : "all",
    distanceFilter: scope.success ? scope.data : "all",
    city: city ?? undefined,
    transferFilter: xfers.success ? xfers.data : "all",
    tripKey,
    board,
    accessible: params.get("access") === "1",
    bike: params.get("bike") === "1",
    night: params.get("night") === "1",
    returnDatetime,
    returnTripKey: params.get("rtrip")?.trim() || undefined,
  };
}

export function snapshotForShare(input: {
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
  leaveNow: boolean;
  datetime: string;
  arriveBy: boolean;
  allDay: boolean;
  modeFilter: ModeFilter;
  distanceFilter?: DistanceFilter;
  city?: SelectedPlace | null;
  transferFilter: TransferFilter;
  selected: Itinerary | null;
  board?: boolean;
  accessible?: boolean;
  bike?: boolean;
  night?: boolean;
  returnDatetime?: string;
  returnSelected?: Itinerary | null;
}): ShareSnapshot | null {
  if (!input.from) return null;
  if (!input.board && !input.to) return null;
  const selected = input.selected;
  const pinOutbound = Boolean(selected) && !input.board && !input.returnDatetime;
  return {
    from: input.from,
    to: input.to,
    via: input.via.filter((stop): stop is SelectedPlace => Boolean(stop)),
    leaveNow: pinOutbound ? false : input.leaveNow,
    datetime: pinOutbound && selected
      ? toLocalDateTimeValue(new Date(selected.startTime))
      : input.datetime,
    arriveBy: pinOutbound ? false : input.arriveBy,
    allDay: pinOutbound ? false : input.allDay,
    modeFilter: input.modeFilter,
    distanceFilter: input.distanceFilter,
    city: input.city ?? undefined,
    transferFilter: input.transferFilter,
    tripKey: selected ? itineraryKey(selected) : undefined,
    board: input.board || undefined,
    accessible: input.accessible || undefined,
    bike: input.bike || undefined,
    night: input.night || undefined,
    returnDatetime: input.returnDatetime,
    returnTripKey: input.returnSelected
      ? itineraryKey(input.returnSelected)
      : undefined,
  };
}

export function shareUrlFromSnapshot(snapshot: ShareSnapshot) {
  const query = encodeShareQuery(snapshot);
  return `${window.location.origin}${window.location.pathname}?${query}`;
}
