import { isTransitMode, toLocalDateTimeValue } from "@/lib/format";
import {
  modeFilterSchema,
  selectedPlaceSchema,
  transferFilterSchema,
} from "@/lib/schemas";
import type {
  Itinerary,
  ModeFilter,
  SelectedPlace,
  TransferFilter,
} from "@/lib/transit/types";

export type ShareSnapshot = {
  from: SelectedPlace;
  to: SelectedPlace;
  via: SelectedPlace[];
  leaveNow: boolean;
  datetime: string;
  arriveBy: boolean;
  allDay: boolean;
  modeFilter: ModeFilter;
  transferFilter: TransferFilter;
  tripKey?: string;
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
  params.set("to", encodePlace(snapshot.to));
  for (const stop of snapshot.via) {
    params.append("via", encodePlace(stop));
  }
  if (!snapshot.leaveNow && snapshot.datetime) {
    params.set("at", snapshot.datetime);
  }
  if (snapshot.allDay) params.set("day", "1");
  if (snapshot.arriveBy) params.set("arrive", "1");
  if (snapshot.modeFilter !== "all") params.set("mode", snapshot.modeFilter);
  if (snapshot.transferFilter !== "all") {
    params.set("xfers", snapshot.transferFilter);
  }
  if (snapshot.tripKey) params.set("trip", snapshot.tripKey);
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
  if (!from || !to) return null;

  const via = params
    .getAll("via")
    .map(decodePlace)
    .filter((stop): stop is SelectedPlace => Boolean(stop))
    .slice(0, 2);

  const at = params.get("at")?.trim() ?? "";
  const datetime = at && !Number.isNaN(new Date(at).getTime()) ? at : toLocalDateTimeValue();
  const allDay = params.get("day") === "1";
  const mode = modeFilterSchema.safeParse(params.get("mode") ?? "all");
  const xfers = transferFilterSchema.safeParse(params.get("xfers") ?? "all");
  const tripKey = params.get("trip")?.trim() || undefined;

  return {
    from,
    to,
    via,
    leaveNow: !at && !allDay,
    datetime,
    arriveBy: params.get("arrive") === "1",
    allDay,
    modeFilter: mode.success ? mode.data : "all",
    transferFilter: xfers.success ? xfers.data : "all",
    tripKey,
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
  transferFilter: TransferFilter;
  selected: Itinerary | null;
}): ShareSnapshot | null {
  if (!input.from || !input.to) return null;
  const selected = input.selected;
  return {
    from: input.from,
    to: input.to,
    via: input.via.filter((stop): stop is SelectedPlace => Boolean(stop)),
    leaveNow: selected ? false : input.leaveNow,
    datetime: selected
      ? toLocalDateTimeValue(new Date(selected.startTime))
      : input.datetime,
    arriveBy: selected ? false : input.arriveBy,
    allDay: selected ? false : input.allDay,
    modeFilter: input.modeFilter,
    transferFilter: input.transferFilter,
    tripKey: selected ? itineraryKey(selected) : undefined,
  };
}

export function shareUrlFromSnapshot(snapshot: ShareSnapshot) {
  const query = encodeShareQuery(snapshot);
  return `${window.location.origin}${window.location.pathname}?${query}`;
}
