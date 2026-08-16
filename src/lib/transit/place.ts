import { localizePlaceName } from "@/i18n/place-name";
import type { Messages } from "@/i18n/messages/en";
import { areaLabel, type GeocodeMatch, type SelectedPlace } from "./types";

export function matchToPlace(
  match: GeocodeMatch,
  kinds?: Messages["placeKind"],
): SelectedPlace {
  return {
    id: match.id,
    name: kinds ? localizePlaceName(match.name, kinds) : match.name,
    type: match.type,
    lat: match.lat,
    lon: match.lon,
    area: areaLabel(match.areas),
  };
}

export function coordPlace(
  lat: number,
  lon: number,
  name?: string,
): SelectedPlace {
  return {
    id: `coord:${lat.toFixed(5)},${lon.toFixed(5)}`,
    name: name ?? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
    type: "PLACE",
    lat,
    lon,
  };
}

export function placeToSelected(place: {
  name: string;
  stopId?: string;
  lat: number;
  lon: number;
}): SelectedPlace {
  return {
    id: place.stopId ?? `coord:${place.lat.toFixed(5)},${place.lon.toFixed(5)}`,
    name: place.name,
    type: place.stopId ? "STOP" : "PLACE",
    lat: place.lat,
    lon: place.lon,
  };
}

export function isRoutableStop(place: SelectedPlace): boolean {
  return (
    place.type === "STOP" &&
    place.id.length > 0 &&
    !place.id.startsWith("coord:")
  );
}

export function samePlace(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  return Math.abs(a.lat - b.lat) < 0.00015 && Math.abs(a.lon - b.lon) < 0.00015;
}

export const MAX_VIA_STOPS = 2;
