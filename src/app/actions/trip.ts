"use server";

import { TransitError } from "@/lib/errors";
import { actionClient } from "@/lib/safe-action";
import { itinerarySchema, tripInputSchema } from "@/lib/schemas";
import { motisFetch } from "@/lib/transit/client";

export const getTripAction = actionClient
  .inputSchema(tripInputSchema)
  .outputSchema(itinerarySchema)
  .action(async ({ parsedInput }) => {
    const params = new URLSearchParams({
      tripId: parsedInput.tripId,
      detailedLegs: "true",
    });
    const body = await motisFetch("/v5/trip", params, { revalidate: 300 });
    const parsed = itinerarySchema.safeParse(body);
    if (!parsed.success) {
      throw new TransitError("Unexpected trip response");
    }
    return parsed.data;
  });
