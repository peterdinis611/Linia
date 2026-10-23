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
  "COACH",
  "SUBURBAN",
  "REGIONAL_RAIL",
  "REGIONAL_FAST_RAIL",
  "TRAM",
  "OTHER",
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

const RETRY_STATUS = new Set([429, 502, 503, 504]);

export function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function motisFetch(
  path: string,
  params: URLSearchParams,
  options?: { language?: string; revalidate?: number; signal?: AbortSignal },
) {
  const url = new URL(`${MOTIS_BASE}${path}`);
  params.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const init: RequestInit & { next?: { revalidate: number } } = {
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
    signal: options?.signal,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (options?.signal?.aborted) {
      throw (
        options.signal.reason ?? new DOMException("Aborted", "AbortError")
      );
    }
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (isAbortError(error) || options?.signal?.aborted) throw error;
      lastError = error;
      if (attempt === 0) {
        await wait(300, options?.signal);
        continue;
      }
      throw new TransitError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }

    if (response.ok) return response.json();
    if (attempt === 0 && RETRY_STATUS.has(response.status)) {
      await wait(300, options?.signal);
      continue;
    }
    const detail = await response.text().catch(() => "");
    throw new TransitError(detail || `Request failed (${response.status})`);
  }

  throw new TransitError(
    lastError instanceof Error ? lastError.message : "Network request failed",
  );
}
