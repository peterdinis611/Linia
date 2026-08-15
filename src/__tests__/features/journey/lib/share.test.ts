import { describe, expect, it } from "vitest";
import { berlin, prague, railItinerary } from "@/test/fixtures";
import {
  encodeShareQuery,
  findItineraryIndex,
  itineraryKey,
  parseShareQuery,
  snapshotForShare,
} from "@/features/journey/lib/share";

const base = {
  from: berlin,
  to: prague,
  via: [],
  leaveNow: true,
  datetime: "2026-08-14T08:30",
  arriveBy: false,
  allDay: false,
  modeFilter: "all" as const,
  transferFilter: "all" as const,
};

describe("share", () => {
  it("round-trips a day stamp", () => {
    const query = encodeShareQuery({
      ...base,
      leaveNow: false,
      allDay: true,
      datetime: "2026-08-20T00:00",
    });
    expect(query).toContain("day=1");
    expect(query).toContain("at=2026-08-20T00%3A00");
    const parsed = parseShareQuery(`?${query}`);
    expect(parsed).toMatchObject({
      from: { name: "Berlin Hbf" },
      to: { name: "Praha hl.n." },
      allDay: true,
      leaveNow: false,
      datetime: "2026-08-20T00:00",
    });
  });

  it("finds a selected trip by key", () => {
    const first = railItinerary();
    const second = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      legs: [{ ...first.legs[0]!, tripId: "trip-ec-178", startTime: "2026-08-14T16:00:00Z" }],
    });
    expect(findItineraryIndex([first, second], itineraryKey(second))).toBe(1);
    expect(findItineraryIndex([first], "missing")).toBe(0);
  });

  it("clears the day stamp when a ticket is selected", () => {
    const selected = railItinerary();
    const snapshot = snapshotForShare({
      ...base,
      allDay: true,
      leaveNow: false,
      selected,
    });
    expect(snapshot?.allDay).toBe(false);
    expect(snapshot?.tripKey).toBe(itineraryKey(selected));
  });
});
