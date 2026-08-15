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

  it("round-trips a station board and an accessible return", () => {
    const query = encodeShareQuery({
      ...base,
      board: true,
      to: null,
      accessible: true,
      returnDatetime: "2026-08-16T14:00",
    });
    expect(query).toContain("board=1");
    expect(query).toContain("access=1");
    expect(query).toContain("back=2026-08-16T14%3A00");
    expect(query).not.toContain("to=");
    const parsed = parseShareQuery(`?${query}`);
    expect(parsed).toMatchObject({
      from: { name: "Berlin Hbf" },
      to: null,
      board: true,
      accessible: true,
      returnDatetime: "2026-08-16T14:00",
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

  it("keeps the outbound clock when a return is stamped", () => {
    const outbound = railItinerary();
    const inbound = railItinerary({
      startTime: "2026-08-16T14:00:00Z",
      legs: [
        {
          ...outbound.legs[0]!,
          tripId: "trip-ec-173",
          startTime: "2026-08-16T14:00:00Z",
        },
      ],
    });
    const snapshot = snapshotForShare({
      ...base,
      allDay: true,
      leaveNow: false,
      returnDatetime: "2026-08-16T14:00",
      selected: outbound,
      returnSelected: inbound,
    });
    expect(snapshot?.allDay).toBe(true);
    expect(snapshot?.leaveNow).toBe(false);
    expect(snapshot?.datetime).toBe(base.datetime);
    expect(snapshot?.returnDatetime).toBe("2026-08-16T14:00");
    expect(snapshot?.returnTripKey).toBe(itineraryKey(inbound));
    expect(encodeShareQuery(snapshot!)).toContain("rtrip=");
  });

  it("drops a ticket without a destination unless the board is stamped", () => {
    expect(parseShareQuery("?from=52.52500*13.36900*STOP*stop-berlin*Berlin%20Hbf")).toBeNull();
    expect(
      parseShareQuery(
        "?board=1&from=52.52500*13.36900*STOP*stop-berlin*Berlin%20Hbf",
      ),
    ).toMatchObject({ board: true, to: null, from: { name: "Berlin Hbf" } });
  });
});
