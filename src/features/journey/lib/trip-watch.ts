import { isTransitMode, legName } from "@/lib/format";
import type { Itinerary } from "@/lib/transit/types";
import { itineraryKey } from "./share";
import { ticketFault } from "./ticket-notes";

export type WatchFault = {
  key: string;
  cancelled: boolean;
  delayMinutes: number | null;
  line: string;
};

export type WatchDelta = "cancelled" | "delay" | "gone";

export function watchKey(itinerary: Itinerary) {
  const trips = itinerary.legs
    .filter((leg) => isTransitMode(leg.mode) && leg.tripId)
    .map((leg) => leg.tripId!)
    .join(",");
  return trips || itineraryKey(itinerary);
}

export function watchLine(itinerary: Itinerary) {
  const transit = itinerary.legs.find((leg) => isTransitMode(leg.mode));
  return transit ? legName(transit) : "Linia";
}

export function watchFault(itinerary: Itinerary): WatchFault {
  const fault = ticketFault(itinerary);
  return {
    key: watchKey(itinerary),
    cancelled: fault.cancelled,
    delayMinutes: fault.delayMinutes,
    line: watchLine(itinerary),
  };
}

export function findWatched(list: Itinerary[], key: string) {
  return list.find((item) => watchKey(item) === key) ?? null;
}

export function watchDelta(prev: WatchFault, next: Itinerary | null): WatchDelta | null {
  if (!next) return "gone";
  const fault = ticketFault(next);
  if (fault.cancelled && !prev.cancelled) return "cancelled";
  const was = prev.delayMinutes ?? 0;
  const now = fault.delayMinutes ?? 0;
  if (now > was) return "delay";
  return null;
}

export function notificationsReady() {
  return typeof Notification !== "undefined";
}
