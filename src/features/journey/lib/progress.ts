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
