"use server";

import { TransitError } from "@/lib/errors";
import { actionClient } from "@/lib/safe-action";
import {
  stopTimesInputSchema,
  stopTimesResponseSchema,
} from "@/lib/schemas";
import { motisFetch, transitModesFor } from "@/lib/transit/client";
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
    return parsed.data;
  });
