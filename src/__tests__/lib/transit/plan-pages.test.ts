import { describe, expect, it, vi } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  collectPlanPages,
  planPageDone,
  uniqueJourneys,
} from "@/lib/transit/plan-pages";

describe("uniqueJourneys", () => {
  it("keeps one copy of the same trip", () => {
    const first = railItinerary();
    const copy = railItinerary();
    const later = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      legs: [{ ...first.legs[0]!, tripId: "trip-ec-178" }],
    });
    expect(uniqueJourneys([first, copy, later])).toHaveLength(2);
  });
});

describe("planPageDone", () => {
  it("stops when a day's last trip has left the stamp", () => {
    const last = railItinerary({ startTime: "2026-08-15T00:10:00Z" });
    expect(
      planPageDone({
        allDay: true,
        arriveBy: false,
        stamp: "2026-08-14T00:00",
        last,
        added: 1,
        horizonSeconds: 86_400,
      }),
    ).toBe(true);
  });

  it("keeps paging while trips still sit on the requested day", () => {
    expect(
      planPageDone({
        allDay: true,
        arriveBy: false,
        stamp: "2026-08-14T00:00",
        last: railItinerary(),
        added: 8,
        horizonSeconds: 86_400,
      }),
    ).toBe(false);
  });

  it("stops a near board once the horizon is passed", () => {
    const last = railItinerary({ startTime: "2026-08-14T21:00:00Z" });
    expect(
      planPageDone({
        allDay: false,
        arriveBy: false,
        stamp: "2026-08-14T08:00:00Z",
        last,
        added: 20,
        horizonSeconds: 12 * 3600,
      }),
    ).toBe(true);
  });
});

describe("collectPlanPages", () => {
  it("follows nextPageCursor until the day is printed", async () => {
    const morning = railItinerary({ startTime: "2026-08-14T08:00:00Z" });
    const noon = railItinerary({
      startTime: "2026-08-14T12:00:00Z",
      legs: [{ ...railItinerary().legs[0]!, tripId: "trip-noon" }],
    });
    const nextDay = railItinerary({
      startTime: "2026-08-15T01:00:00Z",
      legs: [{ ...railItinerary().legs[0]!, tripId: "trip-next" }],
    });
    const fetchNext = vi.fn(async (cursor: string) => {
      if (cursor === "p1") return { itineraries: [noon], nextPageCursor: "p2" };
      return { itineraries: [nextDay] };
    });

    const pages = await collectPlanPages(
      { itineraries: [morning], nextPageCursor: "p1" },
      fetchNext,
      {
        allDay: true,
        arriveBy: false,
        stamp: "2026-08-14T00:00",
        maxPages: 8,
        horizonSeconds: 86_400,
      },
    );

    expect(pages).toHaveLength(2);
    expect(fetchNext).toHaveBeenCalledTimes(2);
    expect(pages.flat().map((item) => item.legs[0]?.tripId)).toEqual([
      "trip-ec-172",
      "trip-noon",
    ]);
  });

  it("does not ask MOTIS again when the first page is the whole board", async () => {
    const fetchNext = vi.fn(async () => ({ itineraries: [railItinerary()] }));
    const pages = await collectPlanPages(
      { itineraries: [railItinerary()] },
      fetchNext,
      {
        allDay: false,
        arriveBy: false,
        stamp: "2026-08-14T08:00:00Z",
        maxPages: 4,
        horizonSeconds: 12 * 3600,
      },
    );
    expect(pages).toHaveLength(1);
    expect(fetchNext).not.toHaveBeenCalled();
  });
});
