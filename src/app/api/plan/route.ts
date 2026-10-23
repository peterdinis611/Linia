import { TransitError } from "@/lib/errors";
import { planJourneyInputSchema, planResponseSchema } from "@/lib/schemas";
import { isAbortError } from "@/lib/transit/client";
import { executePlan } from "@/lib/transit/execute-plan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = planJourneyInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: issue?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const data = await executePlan(parsed.data, { signal: request.signal });
    return Response.json(planResponseSchema.parse(data));
  } catch (error) {
    if (isAbortError(error) || request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const message =
      error instanceof TransitError
        ? error.message
        : error instanceof Error
          ? error.message
          : "errors.searchFailed";
    const status = message.startsWith("validation.") ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
