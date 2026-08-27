import { describe, expect, it } from "vitest";
import {
  isoOnLocalDate,
  liveTransitLegIndex,
  parseHallDateTime,
  startOfLocalDay,
  toLocalDateTimeValue,
  waitUntil,
} from "@/lib/format";
import { railItinerary } from "@/test/fixtures";

describe("hall date stamps", () => {
  it("prints a local datetime value without seconds", () => {
    expect(toLocalDateTimeValue(new Date(2026, 7, 14, 8, 30))).toBe(
      "2026-08-14T08:30",
    );
  });

  it("rolls a stamp back to the start of that local day", () => {
    expect(startOfLocalDay("2026-08-14T21:45")).toBe("2026-08-14T00:00");
  });

  it("parses a hall stamp as local civil time", () => {
    const date = parseHallDateTime("2026-08-14T08:30");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(30);
  });

  it("compares an ISO instant to the local date of a stamp", () => {
    const stamp = startOfLocalDay("2026-08-14T08:00");
    expect(isoOnLocalDate("2026-08-14T12:00:00", stamp)).toBe(true);
    expect(isoOnLocalDate("2026-12-01T12:00:00Z", stamp)).toBe(false);
  });
});

describe("service wait and live legs", () => {
  it("prints how long until the next stamp", () => {
    const now = Date.parse("2026-08-14T08:00:00Z");
    expect(waitUntil("2026-08-14T12:00:00Z", undefined, now)).toBe("4h");
    expect(waitUntil("2026-08-14T08:45:00Z", undefined, now)).toBe("45 min");
  });

  it("points at the transit leg that is live now", () => {
    const seed = railItinerary();
    const itinerary = railItinerary({
      legs: [
        {
          ...seed.legs[0]!,
          startTime: "2026-08-14T08:00:00Z",
          endTime: "2026-08-14T09:00:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
          scheduledEndTime: "2026-08-14T09:00:00Z",
          tripId: "leg-a",
        },
        {
          ...seed.legs[0]!,
          mode: "WALK",
          startTime: "2026-08-14T09:00:00Z",
          endTime: "2026-08-14T09:12:00Z",
          scheduledStartTime: "2026-08-14T09:00:00Z",
          scheduledEndTime: "2026-08-14T09:12:00Z",
          tripId: undefined,
          agencyName: undefined,
        },
        {
          ...seed.legs[0]!,
          startTime: "2026-08-14T09:20:00Z",
          endTime: "2026-08-14T12:30:00Z",
          scheduledStartTime: "2026-08-14T09:20:00Z",
          scheduledEndTime: "2026-08-14T12:30:00Z",
          tripId: "leg-b",
        },
      ],
    });

    expect(liveTransitLegIndex(itinerary, Date.parse("2026-08-14T08:30:00Z"))).toBe(
      0,
    );
    expect(liveTransitLegIndex(itinerary, Date.parse("2026-08-14T10:00:00Z"))).toBe(
      2,
    );
    expect(liveTransitLegIndex(itinerary, Date.parse("2026-08-14T07:00:00Z"))).toBe(
      0,
    );
    expect(liveTransitLegIndex(itinerary, Date.parse("2026-08-14T13:00:00Z"))).toBe(
      2,
    );
  });
});
