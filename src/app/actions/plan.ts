"use server";

import { actionClient } from "@/lib/safe-action";
import {
  planJourneyInputSchema,
  planResponseSchema,
} from "@/lib/schemas";
import { executePlan } from "@/lib/transit/execute-plan";

export const planJourneyAction = actionClient
  .inputSchema(planJourneyInputSchema)
  .outputSchema(planResponseSchema)
  .action(async ({ parsedInput }) => {
    const data = await executePlan(parsedInput);
    return {
      ...data,
      itineraries: data.itineraries ?? [],
      direct: data.direct ?? [],
    };
  });
