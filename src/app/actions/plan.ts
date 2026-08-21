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
import { resolveStopId } from "@/lib/transit/resolve-stop";
import type { Itinerary } from "@/lib/transit/types";

const DAY_SECONDS = 86_400;
const NEAR_SECONDS = 21_600;
const DAY_ITINERARIES = 24;
const NEAR_ITINERARIES = 20;
const MAX_DAY_PAGES = 2;

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
      const viaIds: string[] = [];
      for (const stop of parsedInput.via) {
        viaIds.push(await resolveStopId(stop, parsedInput.language));
      }
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
    const pages = [first.itineraries];
    let cursor = first.nextPageCursor;
    const stamp = time ?? parsedInput.time;

    if (allDay && stamp) {
      for (let page = 1; page < MAX_DAY_PAGES && cursor; page += 1) {
        const last = pages.at(-1)?.at(-1);
        if (last && !isoOnLocalDate(last.startTime, stamp)) break;
        params.set("pageCursor", cursor);
        const next = await fetchPlanPage(params, parsedInput.language, revalidate);
        pages.push(next.itineraries);
        cursor = next.nextPageCursor;
      }
    }

    const itineraries = uniqueJourneys(pages.flat());
    let kept = allDay && stamp
      ? itineraries.filter((item) => isoOnLocalDate(item.startTime, stamp))
      : itineraries;
    let serviceFrom: string | undefined;

    if (
      kept.length === 0 &&
      !allDay &&
      !parsedInput.arriveBy &&
      parsedInput.from.type === "STOP" &&
      parsedInput.from.id &&
      !parsedInput.from.id.startsWith("coord:")
    ) {
      const nextStamp = await peekFirstDeparture(
        parsedInput.from.id,
        parsedInput.language,
      );
      const requested = stamp ? Date.parse(stamp) : Date.now();
      if (
        nextStamp &&
        Date.parse(nextStamp) - requested > 3 * 60 * 60 * 1000
      ) {
        params.delete("pageCursor");
        params.set("time", nextStamp);
        const later = await fetchPlanPage(params, parsedInput.language, revalidate);
        kept = uniqueJourneys(later.itineraries);
        if (kept.length > 0) serviceFrom = nextStamp;
      }
    }

    return {
      from: first.from,
      to: first.to,
      itineraries: kept,
      direct: first.direct,
      serviceFrom,
    };
  });

async function peekFirstDeparture(stopId: string, language?: string) {
  try {
    const params = new URLSearchParams({
      stopId,
      n: "1",
      arriveBy: "false",
    });
    const body = await motisFetch("/v5/stoptimes", params, { language });
    const event = Array.isArray((body as { stopTimes?: unknown }).stopTimes)
      ? (body as { stopTimes: Array<{ place?: { departure?: string; scheduledDeparture?: string } }> }).stopTimes[0]
      : undefined;
    const stamp = event?.place?.departure ?? event?.place?.scheduledDeparture;
    return typeof stamp === "string" && stamp ? stamp : undefined;
  } catch {
    return undefined;
  }
}

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

function uniqueJourneys(items: Itinerary[]) {
  const seen = new Set<string>();
  const out: Itinerary[] = [];
  for (const item of items) {
    const key = [
      item.startTime,
      item.endTime,
      item.transfers,
      item.legs.map((leg) => leg.tripId ?? leg.routeShortName ?? "").join(","),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseItineraries(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = itinerarySchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
