import {
  formatDuration,
  isTransitMode,
  legColor,
  type TranslateFn,
} from "@/lib/format";
import type { Itinerary, Leg } from "@/lib/transit/types";

export type CarrierStats = {
  name: string;
  connections: number;
  fastestDuration: number;
  fewestTransfers: number;
  modes: string[];
  bestItineraryIndex: number;
  color: string;
};

export function transitAgencies(itinerary: Itinerary): string[] {
  const names: string[] = [];
  for (const leg of itinerary.legs) {
    const name = carrierName(leg);
    if (!name) continue;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function carrierName(leg: Leg): string | null {
  if (!isTransitMode(leg.mode)) return null;
  return leg.agencyName?.trim() || null;
}

export function itineraryMatchesCarriers(
  itinerary: Itinerary,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  const agencies = transitAgencies(itinerary);
  return selected.some((name) => agencies.includes(name));
}

export function compareCarriers(itineraries: Itinerary[]): CarrierStats[] {
  const byName = new Map<
    string,
    {
      connections: Set<number>;
      fastestDuration: number;
      fewestTransfers: number;
      modes: Set<string>;
      bestItineraryIndex: number;
      color: string;
    }
  >();

  itineraries.forEach((itinerary, index) => {
    const seen = new Set<string>();
    for (const leg of itinerary.legs) {
      const name = carrierName(leg);
      if (!name || seen.has(name)) continue;
      seen.add(name);

      const current = byName.get(name);
      if (!current) {
        byName.set(name, {
          connections: new Set([index]),
          fastestDuration: itinerary.duration,
          fewestTransfers: itinerary.transfers,
          modes: new Set([leg.mode]),
          bestItineraryIndex: index,
          color: legColor(leg),
        });
        continue;
      }

      current.connections.add(index);
      current.modes.add(leg.mode);
      if (itinerary.duration < current.fastestDuration) {
        current.fastestDuration = itinerary.duration;
        current.fewestTransfers = itinerary.transfers;
        current.bestItineraryIndex = index;
        current.color = legColor(leg);
      }
    }
  });

  return [...byName.entries()]
    .map(([name, stats]) => ({
      name,
      connections: stats.connections.size,
      fastestDuration: stats.fastestDuration,
      fewestTransfers: stats.fewestTransfers,
      modes: [...stats.modes],
      bestItineraryIndex: stats.bestItineraryIndex,
      color: stats.color,
    }))
    .sort((a, b) => {
      if (a.fastestDuration !== b.fastestDuration) {
        return a.fastestDuration - b.fastestDuration;
      }
      return b.connections - a.connections;
    });
}

export function formatCarrierDuration(seconds: number, t?: TranslateFn): string {
  return formatDuration(seconds, t);
}
