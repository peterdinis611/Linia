import { isoOnLocalDate, toLocalDateTimeValue } from "@/lib/format";
import { motisFetch } from "./client";

export async function peekStopTime(
  stopId: string,
  options?: {
    language?: string;
    arriveBy?: boolean;
    time?: string;
  },
): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      stopId,
      n: "1",
      arriveBy: String(Boolean(options?.arriveBy)),
    });
    if (options?.time) {
      params.set("time", new Date(options.time).toISOString());
    }
    const body = await motisFetch("/v5/stoptimes", params, {
      language: options?.language,
    });
    const event = Array.isArray((body as { stopTimes?: unknown }).stopTimes)
      ? (
          body as {
            stopTimes: Array<{
              place?: {
                departure?: string;
                scheduledDeparture?: string;
                arrival?: string;
                scheduledArrival?: string;
              };
            }>;
          }
        ).stopTimes[0]
      : undefined;
    const stamp =
      event?.place?.departure ??
      event?.place?.scheduledDeparture ??
      event?.place?.arrival ??
      event?.place?.scheduledArrival;
    return typeof stamp === "string" && stamp ? stamp : undefined;
  } catch {
    return undefined;
  }
}

export function hallDayStamp(time?: string, now = new Date()) {
  if (time && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time)) {
    return time.slice(0, 16);
  }
  return toLocalDateTimeValue(time ? new Date(time) : now);
}

export function isSameServiceDay(iso: string, time?: string, now = new Date()) {
  return isoOnLocalDate(iso, hallDayStamp(time, now));
}

export function canPeekStop(place: { type?: string; id?: string } | null | undefined) {
  return Boolean(
    place?.type === "STOP" && place.id && !place.id.startsWith("coord:"),
  );
}
