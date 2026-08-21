import { decodePolyline } from "@/lib/polyline";
import { hasMappableCoords } from "./geocode-rank";
import { placeToSelected } from "./place";
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
