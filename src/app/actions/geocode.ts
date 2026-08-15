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

export const geocodeAction = actionClient
  .inputSchema(geocodeInputSchema)
  .outputSchema(geocodeOutputSchema)
  .action(async ({ parsedInput }) => {
    const params = new URLSearchParams({
      text: parsedInput.query,
    });
    if (parsedInput.language) params.set("language", parsedInput.language);
    return rankGeocodeMatches(
      await motisFetch("/v1/geocode", params, {
        language: parsedInput.language,
        revalidate: 1800,
      }),
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

    const preferred = await rankGeocodeMatches(
      await motisFetch("/v1/reverse-geocode", params, {
        language: parsedInput.language,
        revalidate: 1800,
      }),
    );
    if (preferred.length > 0 || !parsedInput.preferStop) {
      return preferred;
    }

    const fallback = new URLSearchParams({
      place: `${parsedInput.lat},${parsedInput.lon}`,
    });
    if (parsedInput.language) fallback.set("language", parsedInput.language);
    return rankGeocodeMatches(
      await motisFetch("/v1/reverse-geocode", fallback, {
        language: parsedInput.language,
        revalidate: 1800,
      }),
    );
  });

function rankGeocodeMatches(matches: unknown) {
  if (!Array.isArray(matches)) {
    throw new TransitError("Unexpected place search response");
  }

  return matches
    .flatMap((item) => {
      const parsed = geocodeMatchSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => {
      const rank = (type: string) =>
        type === "STOP" ? 0 : type === "ADDRESS" ? 1 : 2;
      const byType = rank(a.type) - rank(b.type);
      if (byType !== 0) return byType;
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, 8);
}
