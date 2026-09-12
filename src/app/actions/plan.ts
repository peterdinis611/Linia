"use server";

import { TransitError } from "@/lib/errors";
import { isoOnLocalDate, startOfLocalDay } from "@/lib/format";
import { actionClient } from "@/lib/safe-action";
import {
  itinerarySchema,
  planJourneyInputSchema,
  planResponseSchema,
  placeSchema,
} from "@/lib/schemas";
import { motisFetch, placeQueryParam, transitModesFor } from "@/lib/transit/client";
import {
  collectPlanPages,
  DAY_ITINERARIES,
  DAY_SECONDS,
  MAX_DAY_PAGES,
  MAX_NEAR_PAGES,
  NEAR_HORIZON_SECONDS,
  NEAR_ITINERARIES,
  NEAR_SECONDS,
  uniqueJourneys,
} from "@/lib/transit/plan-pages";
import {
  canPeekStop,
  isSameServiceDay,
  peekStopTime,
} from "@/lib/transit/peek-stop";
import { resolveStopId } from "@/lib/transit/resolve-stop";

export const planJourneyAction = actionClient
  .inputSchema(planJourneyInputSchema)
  .outputSchema(planResponseSchema)
  .action(async ({ parsedInput }) => {
    const allDay = Boolean(parsedInput.allDay);
    const params = new URLSearchParams({
      fromPlace: placeQueryParam(parsedInput.from),
      toPlace: placeQueryParam(parsedInput.to),
      arriveBy: String(allDay ? false : parsedInput.arriveBy),
      directModes: "WALK",
      timetableView: "true",
      slowDirect: "true",
      numItineraries: String(allDay ? DAY_ITINERARIES : NEAR_ITINERARIES),
      maxPreTransitTime: "2400",
      maxPostTransitTime: "2400",
      maxMatchingDistance: parsedInput.distanceFilter === "suburban" ? "2000" : "1200",
    });

    const transitModes = transitModesFor(parsedInput.modeFilter, {
      night: parsedInput.night,
      distance: parsedInput.distanceFilter,
    });
    if (transitModes) {
      params.set("transitModes", transitModes);
    }
    if (parsedInput.accessible) {
      params.set("pedestrianProfile", "WHEELCHAIR");
      params.set("useRoutedTransfers", "true");
    } else if (parsedInput.bike) {
      params.set("directModes", "BIKE");
      params.set("preTransitModes", "BIKE");
      params.set("postTransitModes", "BIKE");
    }
    if (parsedInput.bike) {
      params.set("requireBikeTransport", "true");
    }

    if (parsedInput.transferFilter === "direct") {
      params.set("maxTransfers", "0");
    }

    const time = allDay && parsedInput.time
      ? startOfLocalDay(parsedInput.time)
      : parsedInput.time;
    if (time) {
      params.set("time", new Date(time).toISOString());
    }

    if (allDay) {
      params.set("searchWindow", String(DAY_SECONDS));
    } else {
      params.set("searchWindow", String(NEAR_SECONDS));
    }

    if (parsedInput.via.length > 0) {
      const viaIds = await Promise.all(
        parsedInput.via.map((stop) => resolveStopId(stop, parsedInput.language)),
      );
      params.set("via", viaIds.join(","));
      params.set("viaMinimumStay", viaIds.map(() => "0").join(","));
    }

    const revalidate = parsedInput.fresh
      ? undefined
      : allDay
        ? 60
        : time
          ? 45
          : undefined;
    const first = await fetchPlanPage(params, parsedInput.language, revalidate);
    const stamp = time ?? parsedInput.time;
    const pages = await collectPlanPages(
      first,
      (cursor) => {
        params.set("pageCursor", cursor);
        return fetchPlanPage(params, parsedInput.language, revalidate);
      },
      {
        allDay,
        arriveBy: allDay ? false : parsedInput.arriveBy,
        stamp,
        maxPages: allDay ? MAX_DAY_PAGES : MAX_NEAR_PAGES,
        horizonSeconds: allDay ? DAY_SECONDS : NEAR_HORIZON_SECONDS,
      },
    );

    const itineraries = uniqueJourneys(pages.flat());
    let kept = allDay && stamp
      ? itineraries.filter((item) => isoOnLocalDate(item.startTime, stamp))
      : itineraries;
    let serviceFrom: string | undefined;
    let lastAt: string | undefined;

    if (kept.length === 0 && canPeekStop(parsedInput.from)) {
      const requested = stamp ? Date.parse(stamp) : Date.now();
      const stopId = parsedInput.from.id;
      const [nextStamp, prevStamp] = await Promise.all([
        peekStopTime(stopId, {
          language: parsedInput.language,
          time: stamp,
        }),
        peekStopTime(stopId, {
          language: parsedInput.language,
          arriveBy: true,
          time: stamp,
        }),
      ]);
      if (
        prevStamp &&
        Date.parse(prevStamp) <= requested &&
        isSameServiceDay(prevStamp, stamp)
      ) {
        lastAt = prevStamp;
      }
      if (nextStamp && Date.parse(nextStamp) > requested) {
        const gap = Date.parse(nextStamp) - requested;
        if (gap > 3 * 60 * 60 * 1000) {
          serviceFrom = nextStamp;
          if (!allDay && !parsedInput.arriveBy) {
            params.delete("pageCursor");
            params.set("time", nextStamp);
            const later = await fetchPlanPage(
              params,
              parsedInput.language,
              revalidate,
            );
            kept = uniqueJourneys(later.itineraries);
          }
        }
      }
    }

    return {
      from: first.from,
      to: first.to,
      itineraries: kept,
      direct: first.direct,
      serviceFrom,
      lastAt,
    };
  });

async function fetchPlanPage(
  params: URLSearchParams,
  language?: string,
  revalidate?: number,
) {
  if (language) params.set("language", language);
  const body = await motisFetch("/v5/plan", params, { language, revalidate });
  if (!body || typeof body !== "object") {
    throw new TransitError("errors.searchFailed");
  }

  const payload = body as Record<string, unknown>;
  const from = placeSchema.optional().safeParse(payload.from);
  const to = placeSchema.optional().safeParse(payload.to);
  const nextPageCursor =
    typeof payload.nextPageCursor === "string" && payload.nextPageCursor
      ? payload.nextPageCursor
      : undefined;

  return {
    from: from.success ? from.data : undefined,
    to: to.success ? to.data : undefined,
    itineraries: parseItineraries(payload.itineraries),
    direct: parseItineraries(payload.direct),
    nextPageCursor,
  };
}

function parseItineraries(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = itinerarySchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
