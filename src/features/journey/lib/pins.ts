import { MAX_VIA_STOPS } from "@/lib/transit/place";
import type { SelectedPlace } from "@/lib/transit/types";

export type PinRole = "from" | "to" | "via";
export type MapPickMode = "idle" | PinRole;
export type PinPlaces = {
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
};

export function viaCount(via: Array<SelectedPlace | null>) {
  return via.filter((stop): stop is SelectedPlace => Boolean(stop)).length;
}

export function canPinVia(via: Array<SelectedPlace | null>) {
  return viaCount(via) < MAX_VIA_STOPS;
}

export function upsertViaList(
  current: Array<SelectedPlace | null>,
  place: SelectedPlace,
): SelectedPlace[] {
  const filled = current.filter((stop): stop is SelectedPlace => Boolean(stop));
  const emptyIndex = current.findIndex((stop) => !stop);
  if (emptyIndex >= 0) {
    return current.map((stop, index) =>
      index === emptyIndex ? place : stop,
    ) as SelectedPlace[];
  }
  if (filled.length < MAX_VIA_STOPS) return [...filled, place];
  return filled.map((stop, index) =>
    index === filled.length - 1 ? place : stop,
  );
}

export function placesAfterPin(
  role: PinRole,
  place: SelectedPlace,
  current: PinPlaces,
): PinPlaces {
  if (role === "from") return { ...current, from: place };
  if (role === "to") return { ...current, to: place };
  return { ...current, via: upsertViaList(current.via, place) };
}

export function roleForMapClick(
  pickMode: MapPickMode,
  places: PinPlaces,
): PinRole | "pending" {
  if (pickMode !== "idle") return pickMode;
  if (!places.from) return "from";
  if (!places.to) return "to";
  if (canPinVia(places.via)) return "via";
  return "pending";
}

export function nextPickAfter(assigned: PinRole, next: PinPlaces): MapPickMode {
  if (assigned === "from") return next.to ? "idle" : "to";
  if (assigned === "to") return next.from ? "idle" : "from";
  return canPinVia(next.via) ? "via" : "idle";
}
