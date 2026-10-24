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

function alertKey(alert: TransitAlert) {
  return `${alert.headerText.trim()}|${alert.descriptionText.trim()}|${alert.effect ?? ""}`;
}

function sharedAlerts(groups: TransitAlert[][]): TransitAlert[] {
  const seen = new Map<string, { alert: TransitAlert; count: number }>();
  for (const group of groups) {
    const keys = new Set<string>();
    for (const alert of uniqueAlerts(group)) {
      const key = alertKey(alert);
      if (keys.has(key)) continue;
      keys.add(key);
      const prev = seen.get(key);
      if (prev) prev.count += 1;
      else seen.set(key, { alert, count: 1 });
    }
  }
  return [...seen.values()]
    .filter((entry) => entry.count >= 2)
    .map((entry) => entry.alert);
}

/** Notices printed on two or more tickets — a ribbon across the hall. */
export function hallAlertsFromItineraries(itineraries: Itinerary[]): TransitAlert[] {
  return sharedAlerts(itineraries.map((item) => alertsFromItinerary(item)));
}

const SEVERE = new Set(["SEVERE", "WARNING"]);
const HARD_EFFECTS = new Set([
  "NO_SERVICE",
  "REDUCED_SERVICE",
  "SIGNIFICANT_DELAYS",
  "DETOUR",
  "STOP_MOVED",
  "ACCESSIBILITY_ISSUE",
]);

/**
 * All notices on this search (union), severe first — “what’s broken on the route”.
 */
export function routeAlertsFromItineraries(
  itineraries: Itinerary[],
  limit = 8,
): TransitAlert[] {
  const all = uniqueAlerts(
    itineraries.flatMap((item) => alertsFromItinerary(item)),
  );
  const rank = (alert: TransitAlert) => {
    const severe = alert.severityLevel && SEVERE.has(alert.severityLevel) ? 0 : 1;
    const hard = alert.effect && HARD_EFFECTS.has(alert.effect) ? 0 : 1;
    return severe * 2 + hard;
  };
  return [...all].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

/**
 * Station-place notices always span the hall.
 * Trip notices only when they land on two or more rows.
 */
export function hallAlertsFromBoard(stopTimes: StopTimeEvent[]): TransitAlert[] {
  const station = uniqueAlerts(
    stopTimes.flatMap((event) => event.place?.alerts ?? []),
  );
  const shared = sharedAlerts(
    stopTimes.map((event) => uniqueAlerts(event.alerts ?? [])),
  );
  return uniqueAlerts([...station, ...shared]);
}
