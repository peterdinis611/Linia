import { hasMappableCoords } from "@/lib/transit/geocode-rank";
import { pathPointsForLeg, pathSliceBetween, pointAlongPath } from "@/lib/transit/path";
import type { Itinerary, Leg, Place } from "@/lib/transit/types";

export type LegPhase = "past" | "current" | "upcoming";

export function legPhase(
  leg: Pick<Leg, "startTime" | "endTime">,
  now = Date.now(),
): LegPhase {
  const start = Date.parse(leg.startTime);
  const end = Date.parse(leg.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
  if (now < start) return "upcoming";
  if (now >= end) return "past";
  return "current";
}

export function itineraryIsLive(itinerary: Itinerary, now = Date.now()) {
  const start = Date.parse(itinerary.startTime);
  const end = Date.parse(itinerary.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return now >= start && now < end;
}

export function currentStopIndex(
  stops: Place[],
  now = Date.now(),
) {
  let current = -1;
  for (let index = 0; index < stops.length; index += 1) {
    const when = Date.parse(
      stops[index]?.arrival ?? stops[index]?.departure ?? "",
    );
    if (!Number.isNaN(when) && when <= now) current = index;
  }
  return current;
}

type TimedAnchor = {
  t: number;
  lat: number;
  lon: number;
};

function pushAnchor(anchors: TimedAnchor[], t: number, place: Place) {
  if (!Number.isFinite(t) || !hasMappableCoords(place.lat, place.lon)) return;
  const prev = anchors.at(-1);
  if (prev && prev.t === t && prev.lat === place.lat && prev.lon === place.lon) {
    return;
  }
  anchors.push({ t, lat: place.lat, lon: place.lon });
}

function timedAnchors(leg: Leg): TimedAnchor[] {
  const anchors: TimedAnchor[] = [];
  pushAnchor(anchors, Date.parse(leg.startTime), leg.from);
  for (const stop of leg.intermediateStops ?? []) {
    const arrival = Date.parse(stop.arrival ?? "");
    const departure = Date.parse(stop.departure ?? "");
    if (Number.isFinite(arrival)) pushAnchor(anchors, arrival, stop);
    if (Number.isFinite(departure) && departure !== arrival) {
      pushAnchor(anchors, departure, stop);
    }
  }
  pushAnchor(anchors, Date.parse(leg.endTime), leg.to);
  return anchors;
}

export function livePositionOnLeg(
  leg: Leg,
  now = Date.now(),
): [number, number] | null {
  if (legPhase(leg, now) !== "current") return null;
  const path = pathPointsForLeg(leg);
  const anchors = timedAnchors(leg);
  if (anchors.length >= 2) {
    for (let index = 0; index < anchors.length - 1; index += 1) {
      const from = anchors[index]!;
      const to = anchors[index + 1]!;
      if (now < from.t || now > to.t) continue;
      const span = to.t - from.t;
      const local = span <= 0 ? 0 : (now - from.t) / span;
      const slice = pathSliceBetween(path, from, to);
      return pointAlongPath(
        slice.length >= 2 ? slice : [[from.lat, from.lon], [to.lat, to.lon]],
        local,
      );
    }
  }
  const start = Date.parse(leg.startTime);
  const end = Date.parse(leg.endTime);
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0) {
    return path[0] ?? (hasMappableCoords(leg.from.lat, leg.from.lon)
      ? [leg.from.lat, leg.from.lon]
      : null);
  }
  return pointAlongPath(path, (now - start) / span);
}
