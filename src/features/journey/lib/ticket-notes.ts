import { delayMinutes, isTransitMode } from "@/lib/format";
import type { Itinerary } from "@/lib/transit/types";

export type WalkNote = {
  kind: "access" | "transfer";
  seconds: number;
  name?: string;
};

export function walkNotes(itinerary: Itinerary): WalkNote[] {
  const notes: WalkNote[] = [];
  const { legs } = itinerary;
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index]!;
    if (leg.mode !== "WALK" && leg.mode !== "BIKE") continue;
    if (leg.duration < 45) continue;
    const prev = legs[index - 1];
    const next = legs[index + 1];
    if (index === 0 && next && isTransitMode(next.mode)) {
      notes.push({
        kind: "access",
        seconds: leg.duration,
        name: next.from.name,
      });
      continue;
    }
    if (
      prev &&
      next &&
      isTransitMode(prev.mode) &&
      isTransitMode(next.mode)
    ) {
      notes.push({ kind: "transfer", seconds: leg.duration });
    }
  }
  return notes;
}

export function ticketFault(itinerary: Itinerary): {
  cancelled: boolean;
  delayMinutes: number | null;
} {
  let cancelled = false;
  let latest: number | null = null;
  for (const leg of itinerary.legs) {
    if (!isTransitMode(leg.mode)) continue;
    if (leg.cancelled) cancelled = true;
    const delay = delayMinutes(leg);
    if (delay != null && delay > 0) {
      latest = Math.max(latest ?? 0, delay);
    }
  }
  return { cancelled, delayMinutes: latest };
}

export function lastDepartureKey(itineraries: Itinerary[]): string | null {
  if (itineraries.length === 0) return null;
  const last = itineraries.reduce((best, item) =>
    Date.parse(item.startTime) >= Date.parse(best.startTime) ? item : best,
  );
  return departureKey(last);
}

export function departureKey(itinerary: Itinerary) {
  return `${itinerary.startTime}|${itinerary.endTime}`;
}
