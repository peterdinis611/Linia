import { describe, expect, it } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  countTransferKinds,
  emptyBoardCopy,
  emptyFilterCopy,
  itineraryMatchesTransfers,
  sortIndexedItineraries,
} from "@/features/journey/lib/filters";

describe("filters", () => {
  const direct = railItinerary({ transfers: 0, duration: 10_000 });
  const change = railItinerary({
    transfers: 1,
    duration: 8_000,
    startTime: "2026-08-14T16:00:00Z",
  });

  it("matches direct and transfer stamps", () => {
    expect(itineraryMatchesTransfers(direct, "direct")).toBe(true);
    expect(itineraryMatchesTransfers(change, "direct")).toBe(false);
    expect(itineraryMatchesTransfers(change, "transfers")).toBe(true);
    expect(itineraryMatchesTransfers(direct, "all")).toBe(true);
  });

  it("counts kinds on the board", () => {
    expect(countTransferKinds([])).toBeNull();
    expect(countTransferKinds([direct, change, direct])).toEqual({
      direct: 2,
      transfers: 1,
    });
  });

  it("sorts fastest and fewest transfers", () => {
    const items = [
      { itinerary: direct, index: 0 },
      { itinerary: change, index: 1 },
    ];
    expect(sortIndexedItineraries(items, "fastest")[0]?.index).toBe(1);
    expect(sortIndexedItineraries(items, "transfers")[0]?.index).toBe(0);
    expect(sortIndexedItineraries(items, "depart")).toEqual(items);
  });

  it("picks empty-board copy", () => {
    expect(emptyBoardCopy(false).title).toBe("board.idleTitle");
    expect(emptyBoardCopy(true).title).toBe("board.emptyTitle");
    expect(emptyFilterCopy("direct", true)).toBe("results.emptyDirectCarriers");
  });
});
