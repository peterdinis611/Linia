import { TransitError } from "@/lib/errors";
import { hasMappableCoords } from "./geocode-rank";
import type { DistanceFilter, ModeFilter, SelectedPlace } from "@/lib/schemas";

export const MOTIS_BASE = (
  process.env.MOTIS_BASE ?? "https://api.transitous.org/api"
).replace(/\/$/, "");

export const USER_AGENT =
  "Linia/0.1 (open-source transit search; https://github.com/peterdinis)";

const TRAIN_MODES = [
  "RAIL",
  "HIGHSPEED_RAIL",
  "LONG_DISTANCE",
  "NIGHT_RAIL",
  "REGIONAL_RAIL",
  "REGIONAL_FAST_RAIL",
  "SUBURBAN",
  "SUBWAY",
  "TRAM",
  "FERRY",
] as const;

const BUS_MODES = ["BUS", "COACH"] as const;

const LONG_DISTANCE_MODES = [
  "HIGHSPEED_RAIL",
  "LONG_DISTANCE",
  "NIGHT_RAIL",
  "COACH",
] as const;

const SUBURBAN_MODES = [
  "BUS",
  "SUBURBAN",
  "REGIONAL_RAIL",
  "REGIONAL_FAST_RAIL",
] as const;

export function placeQueryParam(place: SelectedPlace): string {
  if (
    place.type === "STOP" &&
    place.id &&
    !place.id.startsWith("coord:") &&
    hasMappableCoords(place.lat, place.lon)
  ) {
    return place.id;
  }
  return `${place.lat},${place.lon}`;
}

export function transitModesFor(
  filter: ModeFilter,
  options?: { night?: boolean; distance?: DistanceFilter },
): string | undefined {
  if (options?.night) return "NIGHT_RAIL";
  const byVehicle =
    filter === "train" ? TRAIN_MODES : filter === "bus" ? BUS_MODES : undefined;
  const byDistance =
    options?.distance === "long"
      ? LONG_DISTANCE_MODES
      : options?.distance === "suburban"
        ? SUBURBAN_MODES
        : undefined;
  if (!byDistance) {
    return byVehicle ? byVehicle.join(",") : undefined;
  }
  if (!byVehicle) return byDistance.join(",");
  const modes = byVehicle.filter((mode) =>
    (byDistance as readonly string[]).includes(mode),
  );
  return (modes.length > 0 ? modes : byDistance).join(",");
}

export async function motisFetch(
  path: string,
  params: URLSearchParams,
  options?: { language?: string; revalidate?: number },
) {
  const url = new URL(`${MOTIS_BASE}${path}`);
  params.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...(options?.language
          ? { "Accept-Language": `${options.language},en;q=0.4` }
          : {}),
      },
      cache: options?.revalidate ? "force-cache" : "no-store",
      next: options?.revalidate
        ? { revalidate: options.revalidate }
        : undefined,
    });
  } catch (error) {
    throw new TransitError(
      error instanceof Error ? error.message : "Network request failed",
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new TransitError(detail || `Request failed (${response.status})`);
  }

  return response.json();
}
