import { TransitError } from "@/lib/errors";
import type { ModeFilter, SelectedPlace } from "@/lib/schemas";

export const MOTIS_BASE = (
  process.env.MOTIS_BASE ?? "https://api.transitous.org/api"
).replace(/\/$/, "");

export const USER_AGENT =
  "Linia/0.1 (open-source transit search; https://github.com/peterdinis)";

const TRAIN_MODES = [
  "RAIL",
  "SUBURBAN",
  "SUBWAY",
  "TRAM",
  "FERRY",
] as const;

const BUS_MODES = ["BUS", "COACH"] as const;

export function placeQueryParam(place: SelectedPlace): string {
  if (place.type === "STOP" && place.id) {
    return place.id;
  }
  return `${place.lat},${place.lon}`;
}

export function transitModesFor(filter: ModeFilter): string | undefined {
  if (filter === "train") return TRAIN_MODES.join(",");
  if (filter === "bus") return BUS_MODES.join(",");
  return undefined;
}

export async function motisFetch(
  path: string,
  params: URLSearchParams,
  options?: { language?: string; revalidate?: number },
) {
  const url = new URL(`${MOTIS_BASE}${path}`);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
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
