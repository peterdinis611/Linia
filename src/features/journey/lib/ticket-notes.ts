import { delayMinutes, isTransitMode } from "@/lib/format";
import { samePlace } from "@/lib/transit/place";
import type { Itinerary, Leg, Place } from "@/lib/transit/types";

export const TIGHT_TRANSFER_SECONDS = 5 * 60;
export const TIGHT_SLACK_SECONDS = 90;
export const LEAVES_SOON_SECONDS = 90 * 60;

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

export function trackChange(place: Place): { track: string; was: string } | null {
  const track = place.track?.trim();
  const was = place.scheduledTrack?.trim();
  if (!track || !was || track === was) return null;
  return { track, was };
}

export function ticketTrackChange(itinerary: Itinerary) {
  for (const leg of itinerary.legs) {
    if (!isTransitMode(leg.mode)) continue;
    const boarding = trackChange(leg.from);
    if (boarding) return boarding;
    const alighting = trackChange(leg.to);
    if (alighting) return alighting;
    for (const stop of leg.intermediateStops ?? []) {
      const call = trackChange(stop);
      if (call) return call;
    }
  }
  return null;
}

export type TightTransfer = {
  minutes: number;
  seconds: number;
  walkSeconds: number;
  name: string;
  from: Place;
  to: Place;
};

export function tightTransfers(itinerary: Itinerary): TightTransfer[] {
  const notes: TightTransfer[] = [];
  const { legs } = itinerary;
  let index = 0;
  while (index < legs.length) {
    const leg = legs[index]!;
    if (!isTransitMode(leg.mode)) {
      index += 1;
      continue;
    }
    let nextIndex = index + 1;
    let walkSeconds = 0;
    while (
      nextIndex < legs.length &&
      (legs[nextIndex]!.mode === "WALK" || legs[nextIndex]!.mode === "BIKE")
    ) {
      walkSeconds += legs[nextIndex]!.duration;
      nextIndex += 1;
    }
    const next = legs[nextIndex];
    if (next && isTransitMode(next.mode)) {
      const available =
        (Date.parse(next.startTime) - Date.parse(leg.endTime)) / 1000;
      if (Number.isFinite(available) && available > 0) {
        const slack = available - walkSeconds;
        const tight =
          available <= TIGHT_TRANSFER_SECONDS ||
          (walkSeconds >= 45 && slack >= 0 && slack < TIGHT_SLACK_SECONDS);
        if (tight) {
          notes.push({
            seconds: available,
            minutes: Math.max(1, Math.round(available / 60)),
            walkSeconds,
            name: next.from.name || leg.to.name,
            from: leg.to,
            to: next.from,
          });
        }
      }
    }
    index = nextIndex > index ? nextIndex : index + 1;
  }
  return notes;
}

export function ticketTightTransfer(itinerary: Itinerary): TightTransfer | null {
  const notes = tightTransfers(itinerary);
  if (notes.length === 0) return null;
  return notes.reduce((best, item) =>
    item.seconds < best.seconds ? item : best,
  );
}

export function tightStampForLeg(
  leg: Leg,
  index: number,
  legs: Leg[],
  notes: TightTransfer[],
): TightTransfer | null {
  if (notes.length === 0) return null;
  const walk = leg.mode === "WALK" || leg.mode === "BIKE";
  if (walk) {
    return (
      notes.find(
        (note) => samePlace(note.from, leg.from) && samePlace(note.to, leg.to),
      ) ??
      notes.find(
        (note) => samePlace(note.from, leg.from) || samePlace(note.to, leg.to),
      ) ??
      null
    );
  }
  const prev = legs[index - 1];
  if (prev && (prev.mode === "WALK" || prev.mode === "BIKE")) return null;
  return notes.find((note) => samePlace(note.to, leg.from)) ?? null;
}

export function tightTransferAtPlace(
  place: { lat: number; lon: number; stopId?: string },
  notes: TightTransfer[],
): TightTransfer | null {
  return (
    notes.find(
      (note) => samePlace(note.from, place) || samePlace(note.to, place),
    ) ?? null
  );
}

export function waitToDepartSeconds(startIso: string, now = Date.now()): number | null {
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return null;
  const seconds = Math.round((start - now) / 1000);
  if (seconds <= 0 || seconds > LEAVES_SOON_SECONDS) return null;
  return seconds;
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
