"use server";

import { TransitError } from "@/lib/errors";
import { actionClient } from "@/lib/safe-action";
import {
  geocodeInputSchema,
  geocodeMatchSchema,
  geocodeOutputSchema,
  reverseGeocodeInputSchema,
} from "@/lib/schemas";
import { motisFetch } from "@/lib/transit/client";
import { rankGeocodeMatches } from "@/lib/transit/geocode-rank";
import type { GeocodeMatch } from "@/lib/transit/types";

export const geocodeAction = actionClient
  .inputSchema(geocodeInputSchema)
  .outputSchema(geocodeOutputSchema)
  .action(async ({ parsedInput }) => {
    const params = new URLSearchParams({
      text: parsedInput.query,
    });
    if (parsedInput.language) params.set("language", parsedInput.language);
    if (parsedInput.lat != null && parsedInput.lon != null) {
      params.set("place", `${parsedInput.lat},${parsedInput.lon}`);
      params.set("placeBias", "2");
    }
    return rankGeocodeMatches(
      parseGeocodeMatches(
        await motisFetch("/v1/geocode", params, {
          language: parsedInput.language,
          revalidate: 1800,
        }),
      ),
      parsedInput.query,
    );
  });

export const reverseGeocodeAction = actionClient
  .inputSchema(reverseGeocodeInputSchema)
  .outputSchema(geocodeOutputSchema)
  .action(async ({ parsedInput }) => {
    const params = new URLSearchParams({
      place: `${parsedInput.lat},${parsedInput.lon}`,
    });
    if (parsedInput.language) params.set("language", parsedInput.language);
    if (parsedInput.preferStop) {
      params.set("type", "STOP");
    }

    const preferred = rankGeocodeMatches(
      parseGeocodeMatches(
        await motisFetch("/v1/reverse-geocode", params, {
          language: parsedInput.language,
          revalidate: 1800,
        }),
      ),
    );
    if (preferred.length > 0 || !parsedInput.preferStop) {
      return preferred;
    }

    const fallback = new URLSearchParams({
      place: `${parsedInput.lat},${parsedInput.lon}`,
    });
    if (parsedInput.language) fallback.set("language", parsedInput.language);
    return rankGeocodeMatches(
      parseGeocodeMatches(
        await motisFetch("/v1/reverse-geocode", fallback, {
          language: parsedInput.language,
          revalidate: 1800,
        }),
      ),
    );
  });

function parseGeocodeMatches(matches: unknown): GeocodeMatch[] {
  if (!Array.isArray(matches)) {
    throw new TransitError("Unexpected place search response");
  }

  return matches.flatMap((item) => {
    const parsed = geocodeMatchSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
