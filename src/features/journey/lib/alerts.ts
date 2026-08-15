import type { Itinerary, StopTimeEvent, TransitAlert } from "@/lib/transit/types";

const KNOWN_EFFECTS = new Set([
  "NO_SERVICE",
  "REDUCED_SERVICE",
  "SIGNIFICANT_DELAYS",
  "DETOUR",
  "ADDITIONAL_SERVICE",
  "MODIFIED_SERVICE",
  "OTHER_EFFECT",
  "UNKNOWN_EFFECT",
  "STOP_MOVED",
  "NO_EFFECT",
  "ACCESSIBILITY_ISSUE",
]);

export function alertEffectKey(effect?: string) {
  if (!effect || !KNOWN_EFFECTS.has(effect)) return "alerts.kicker";
  return `alerts.effects.${effect}`;
}

export function uniqueAlerts(alerts: TransitAlert[]): TransitAlert[] {
  const seen = new Set<string>();
  const out: TransitAlert[] = [];
  for (const alert of alerts) {
    const header = alert.headerText.trim();
    const body = alert.descriptionText.trim();
    if (!header && !body) continue;
    const key = `${header}|${body}|${alert.effect ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alert);
  }
  return out;
}

function fromPlace(place?: { alerts?: TransitAlert[] | null }) {
  return place?.alerts ?? [];
}

export function alertsFromItinerary(itinerary: Itinerary): TransitAlert[] {
  const collected: TransitAlert[] = [];
  for (const leg of itinerary.legs) {
    collected.push(...(leg.alerts ?? []));
    collected.push(...fromPlace(leg.from));
    collected.push(...fromPlace(leg.to));
    for (const stop of leg.intermediateStops ?? []) {
      collected.push(...fromPlace(stop));
    }
  }
  return uniqueAlerts(collected);
}

export function alertsFromStopTime(event: StopTimeEvent): TransitAlert[] {
  return uniqueAlerts([...(event.alerts ?? []), ...fromPlace(event.place)]);
}

export function itineraryHasAlerts(itinerary: Itinerary) {
  return alertsFromItinerary(itinerary).length > 0;
}
