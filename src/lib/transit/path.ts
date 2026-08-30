import { isTransitMode } from "@/lib/format";
import { decodePolyline } from "@/lib/polyline";
import { hasMappableCoords } from "./geocode-rank";
import { placeToSelected, samePlace } from "./place";
import type { Itinerary, Leg, Place, SelectedPlace, StopTimeEvent } from "./types";

function pushStop(points: [number, number][], stop: Place) {
  if (!hasMappableCoords(stop.lat, stop.lon)) return;
  const prev = points.at(-1);
  if (
    prev &&
    Math.abs(prev[0] - stop.lat) < 1e-5 &&
    Math.abs(prev[1] - stop.lon) < 1e-5
  ) {
    return;
  }
  points.push([stop.lat, stop.lon]);
}

export function stopPointsForLeg(leg: Leg): [number, number][] {
  const points: [number, number][] = [];
  pushStop(points, leg.from);
  for (const stop of leg.intermediateStops ?? []) pushStop(points, stop);
  pushStop(points, leg.to);
  return points;
}

export function pathPointsForLeg(leg: Leg): [number, number][] {
  const encoded = leg.legGeometry?.points;
  if (encoded) {
    const decoded = decodePolyline(
      encoded,
      leg.legGeometry?.precision ?? 6,
    );
    if (decoded.length > 1) return decoded;
  }
  return stopPointsForLeg(leg);
}

function nearPoint(
  points: [number, number][],
  lat: number,
  lon: number,
) {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const distance = Math.hypot(point[0] - lat, point[1] - lon);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

export function pathSliceBetween(
  points: [number, number][],
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): [number, number][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]!];
  const start = nearPoint(points, from.lat, from.lon);
  const end = nearPoint(points, to.lat, to.lon);
  if (start === end) return [points[start]!];
  return start < end
    ? points.slice(start, end + 1)
    : points.slice(end, start + 1).reverse();
}

export function pointAlongPath(
  points: [number, number][],
  fraction: number,
): [number, number] | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0]!;
  const clamped = Math.min(1, Math.max(0, fraction));
  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]!;
    const next = points[index]!;
    const length = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return points[0]!;
  let remain = clamped * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]!;
    const last = index === lengths.length - 1;
    if (remain <= length || last) {
      const mix = length === 0 ? 0 : Math.min(1, remain / length);
      const prev = points[index]!;
      const next = points[index + 1]!;
      return [
        prev[0] + (next[0] - prev[0]) * mix,
        prev[1] + (next[1] - prev[1]) * mix,
      ];
    }
    remain -= length;
  }
  return points.at(-1) ?? null;
}

export function mapCallStops(
  itinerary: Itinerary,
  skip: Array<{ lat: number; lon: number }> = [],
): Place[] {
  const calls: Place[] = [];
  const seen = new Set<string>();
  for (const leg of itinerary.legs) {
    if (!isTransitMode(leg.mode)) continue;
    const chain = [leg.from, ...(leg.intermediateStops ?? []), leg.to];
    for (const stop of chain) {
      if (!hasMappableCoords(stop.lat, stop.lon)) continue;
      if (skip.some((pin) => samePlace(pin, stop))) continue;
      const key =
        stop.stopId ||
        `${stop.name}:${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      calls.push(stop);
    }
  }
  return calls;
}

export function itineraryEndPlace(itinerary: Itinerary): SelectedPlace | null {
  for (let index = itinerary.legs.length - 1; index >= 0; index -= 1) {
    const leg = itinerary.legs[index]!;
    const chain = [leg.from, ...(leg.intermediateStops ?? []), leg.to];
    for (let stopIndex = chain.length - 1; stopIndex > 0; stopIndex -= 1) {
      const stop = chain[stopIndex]!;
      if (hasMappableCoords(stop.lat, stop.lon)) {
        return placeToSelected(stop);
      }
    }
  }
  return null;
}

export function boardDestinations(events: StopTimeEvent[]): SelectedPlace[] {
  const seen = new Set<string>();
  const out: SelectedPlace[] = [];
  for (const event of events) {
    const place = event.tripTo;
    if (!place || !hasMappableCoords(place.lat, place.lon)) continue;
    const key =
      place.stopId ||
      `${place.name}:${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(placeToSelected(place));
  }
  return out;
}

export function boardDestinationName(event: StopTimeEvent) {
  return (event.tripTo?.name || event.headsign || "").trim();
}

export function mapDestination(input: {
  itinerary: Itinerary | null;
  event?: StopTimeEvent | null;
  ends: SelectedPlace[];
}): SelectedPlace | null {
  if (input.itinerary) {
    const end = itineraryEndPlace(input.itinerary);
    if (end) return end;
  }
  const tripTo = input.event?.tripTo;
  if (tripTo && hasMappableCoords(tripTo.lat, tripTo.lon)) {
    return placeToSelected(tripTo);
  }
  const name = input.event ? boardDestinationName(input.event) : "";
  if (name) {
    const named = input.ends.find(
      (place) => place.name.toLowerCase() === name.toLowerCase(),
    );
    if (named) return named;
  }
  return input.ends[0] ?? null;
}

export function itineraryFromStopTime(event: StopTimeEvent): Itinerary | null {
  const start = event.place;
  const end = event.tripTo;
  if (
    !end ||
    !hasMappableCoords(start.lat, start.lon) ||
    !hasMappableCoords(end.lat, end.lon)
  ) {
    return null;
  }
  const startTime =
    start.departure ?? start.scheduledDeparture ?? start.arrival ?? "";
  const endTime =
    end.arrival ?? end.scheduledArrival ?? end.departure ?? startTime;
  if (!startTime || !endTime) return null;
  return {
    duration: Math.max(
      0,
      Math.round((Date.parse(endTime) - Date.parse(startTime)) / 1000),
    ),
    startTime,
    endTime,
    transfers: 0,
    legs: [
      {
        mode: event.mode,
        startTime,
        endTime,
        scheduledStartTime: start.scheduledDeparture ?? startTime,
        scheduledEndTime: end.scheduledArrival ?? endTime,
        realTime: event.realTime,
        scheduled: true,
        duration: Math.max(
          0,
          Math.round((Date.parse(endTime) - Date.parse(startTime)) / 1000),
        ),
        from: start,
        to: end,
        headsign: event.headsign,
        routeColor: event.routeColor,
        routeTextColor: event.routeTextColor,
        routeShortName: event.routeShortName,
        routeLongName: event.routeLongName,
        displayName: event.displayName,
        agencyName: event.agencyName,
        tripId: event.tripId,
        cancelled: event.cancelled || event.tripCancelled,
        intermediateStops: [],
        legGeometry: { points: "", precision: 6, length: 0 },
      },
    ],
  };
}
