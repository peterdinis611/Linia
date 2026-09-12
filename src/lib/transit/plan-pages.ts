import { isoOnLocalDate } from "@/lib/format";
import type { Itinerary } from "@/lib/transit/types";

export const DAY_SECONDS = 86_400;
export const NEAR_SECONDS = 28_800;
export const NEAR_HORIZON_SECONDS = 43_200;
export const DAY_ITINERARIES = 40;
export const NEAR_ITINERARIES = 32;
export const MAX_DAY_PAGES = 8;
export const MAX_NEAR_PAGES = 4;
export const BOARD_PAGE_SIZE = 40;

export function journeyKey(item: Itinerary) {
  return [
    item.startTime,
    item.endTime,
    item.transfers,
    item.legs.map((leg) => leg.tripId ?? leg.routeShortName ?? "").join(","),
  ].join("|");
}

export function uniqueJourneys(items: Itinerary[]) {
  const seen = new Set<string>();
  const out: Itinerary[] = [];
  for (const item of items) {
    const key = journeyKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function planPageDone(input: {
  allDay: boolean;
  arriveBy: boolean;
  stamp?: string;
  last?: Itinerary;
  added: number;
  horizonSeconds: number;
}) {
  if (input.added === 0) return true;
  if (!input.last) return false;
  if (input.allDay && input.stamp) {
    return !isoOnLocalDate(input.last.startTime, input.stamp);
  }
  if (!input.stamp) return false;
  const origin = Date.parse(input.stamp);
  const at = Date.parse(input.arriveBy ? input.last.endTime : input.last.startTime);
  if (!Number.isFinite(origin) || !Number.isFinite(at)) return false;
  const span = input.arriveBy ? origin - at : at - origin;
  return span > input.horizonSeconds * 1000;
}

export async function collectPlanPages<T extends { itineraries: Itinerary[]; nextPageCursor?: string }>(
  first: T,
  fetchNext: (cursor: string) => Promise<T>,
  options: {
    allDay: boolean;
    arriveBy: boolean;
    stamp?: string;
    maxPages: number;
    horizonSeconds: number;
  },
) {
  const pages = [first.itineraries];
  let cursor = first.nextPageCursor;
  for (let page = 1; page < options.maxPages && cursor; page += 1) {
    const lastPage = pages.at(-1) ?? [];
    if (
      planPageDone({
        allDay: options.allDay,
        arriveBy: options.arriveBy,
        stamp: options.stamp,
        last: lastPage.at(-1),
        added: lastPage.length,
        horizonSeconds: options.horizonSeconds,
      })
    ) {
      break;
    }
    const next = await fetchNext(cursor);
    if (next.itineraries.length === 0) break;
    if (
      planPageDone({
        allDay: options.allDay,
        arriveBy: options.arriveBy,
        stamp: options.stamp,
        last: next.itineraries[0],
        added: next.itineraries.length,
        horizonSeconds: options.horizonSeconds,
      })
    ) {
      break;
    }
    pages.push(next.itineraries);
    cursor = next.nextPageCursor;
  }
  return pages;
}
