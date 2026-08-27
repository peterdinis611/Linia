"use server";

import { TransitError } from "@/lib/errors";
import { actionClient } from "@/lib/safe-action";
import {
  stopTimesInputSchema,
  stopTimesResponseSchema,
} from "@/lib/schemas";
import { motisFetch, transitModesFor } from "@/lib/transit/client";
import {
  canPeekStop,
  isSameServiceDay,
  peekStopTime,
} from "@/lib/transit/peek-stop";
import { resolveStopId } from "@/lib/transit/resolve-stop";

export const getStopTimesAction = actionClient
  .inputSchema(stopTimesInputSchema)
  .outputSchema(stopTimesResponseSchema)
  .action(async ({ parsedInput }) => {
    const stopId = await resolveStopId(
      parsedInput.stop,
      parsedInput.language,
      "validation.originMustBeStation",
    );
    const params = new URLSearchParams({
      stopId,
      n: String(parsedInput.n),
      arriveBy: String(parsedInput.arriveBy),
    });
    const transitModes = transitModesFor(parsedInput.modeFilter, {
      night: parsedInput.night,
      distance: parsedInput.distanceFilter,
    });
    if (transitModes) {
      for (const mode of transitModes.split(",")) {
        params.append("mode", mode);
      }
    }
    if (parsedInput.time) {
      params.set("time", new Date(parsedInput.time).toISOString());
    }
    if (parsedInput.pageCursor) {
      params.set("pageCursor", parsedInput.pageCursor);
    }
    if (parsedInput.language) {
      params.set("language", parsedInput.language);
    }

    const body = await motisFetch("/v5/stoptimes", params, {
      language: parsedInput.language,
    });
    if (!body || typeof body !== "object") {
      throw new TransitError("errors.searchFailed");
    }
    const parsed = stopTimesResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new TransitError("errors.searchFailed");
    }
    if (parsed.data.stopTimes.length > 0) {
      return parsed.data;
    }

    let lastAt: string | undefined;
    let serviceFrom: string | undefined;
    if (canPeekStop({ type: "STOP", id: stopId })) {
      const requested = parsedInput.time
        ? Date.parse(parsedInput.time)
        : Date.now();
      const [nextStamp, prevStamp] = await Promise.all([
        peekStopTime(stopId, {
          language: parsedInput.language,
          time: parsedInput.time,
        }),
        peekStopTime(stopId, {
          language: parsedInput.language,
          arriveBy: true,
          time: parsedInput.time,
        }),
      ]);
      if (
        prevStamp &&
        Date.parse(prevStamp) <= requested &&
        isSameServiceDay(prevStamp, parsedInput.time)
      ) {
        lastAt = prevStamp;
      }
      if (nextStamp && Date.parse(nextStamp) > requested) {
        if (Date.parse(nextStamp) - requested > 3 * 60 * 60 * 1000) {
          serviceFrom = nextStamp;
        }
      }
    }

    return {
      ...parsed.data,
      lastAt,
      serviceFrom,
    };
  });
