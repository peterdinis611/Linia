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
      numResults: "20",
    });
    if (parsedInput.language) params.set("language", parsedInput.language);
    if (parsedInput.lat != null && parsedInput.lon != null) {
      params.set("place", `${parsedInput.lat},${parsedInput.lon}`);
      params.set(
        "placeBias",
        String(parsedInput.placeBias ?? (parsedInput.type === "PLACE" ? 1 : 2)),
      );
    }
    if (parsedInput.type === "PLACE") {
      params.set("type", "PLACE");
      const places = parseGeocodeMatches(
        await motisFetch("/v1/geocode", params, {
          language: parsedInput.language,
          revalidate: 1800,
        }),
      );
      const ranked = rankGeocodeMatches(places, parsedInput.query, {
        preferType: "PLACE",
      });
      if (ranked.length > 0) return ranked;
      params.delete("type");
    }
    const stopParams = new URLSearchParams(params);
    stopParams.set("type", "STOP");
    const [all, stops] = await Promise.all([
      motisFetch("/v1/geocode", params, {
        language: parsedInput.language,
        revalidate: 1800,
      }),
      motisFetch("/v1/geocode", stopParams, {
        language: parsedInput.language,
        revalidate: 1800,
      }),
    ]);
    return rankGeocodeMatches(
      mergeGeocodeMatches(parseGeocodeMatches(stops), parseGeocodeMatches(all)),
      parsedInput.query,
      parsedInput.type === "PLACE" ? { preferType: "PLACE" } : undefined,
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

function mergeGeocodeMatches(...lists: GeocodeMatch[][]) {
  const seen = new Set<string>();
  const out: GeocodeMatch[] = [];
  for (const list of lists) {
    for (const match of list) {
      const key = match.id || `${match.type}:${match.lat},${match.lon}:${match.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(match);
    }
  }
  return out;
}

function parseGeocodeMatches(matches: unknown): GeocodeMatch[] {
  if (!Array.isArray(matches)) {
    throw new TransitError("Unexpected place search response");
  }

  return matches.flatMap((item) => {
    const parsed = geocodeMatchSchema.safeParse(item);
    if (!parsed.success) return [];
    const match = parsed.data;
    if (match.id.trim()) return [match];
    return [
      {
        ...match,
        id: `coord:${match.lat.toFixed(5)},${match.lon.toFixed(5)}`,
      },
    ];
  });
}
