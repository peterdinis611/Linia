import { TransitError } from "@/lib/errors";
import { geocodeMatchSchema } from "@/lib/schemas";
import { motisFetch } from "./client";
import { isRoutableStop } from "./place";
import type { SelectedPlace } from "./types";

export async function resolveStopId(
  place: SelectedPlace,
  language?: string,
  errorKey = "validation.viaMustBeStation",
) {
  if (isRoutableStop(place)) {
    return place.id;
  }

  const params = new URLSearchParams({
    place: `${place.lat},${place.lon}`,
    type: "STOP",
  });
  if (language) params.set("language", language);
  const matches = await motisFetch("/v1/reverse-geocode", params, {
    language,
    revalidate: 1800,
  });
  if (!Array.isArray(matches)) {
    throw new TransitError(errorKey);
  }
  const stop = matches
    .map((item) => geocodeMatchSchema.safeParse(item))
    .find((parsed) => parsed.success && parsed.data.type === "STOP");
  if (!stop || !stop.success) {
    throw new TransitError(errorKey);
  }
  return stop.data.id;
}
