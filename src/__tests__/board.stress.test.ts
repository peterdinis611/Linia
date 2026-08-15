import { describe, expect, it } from "vitest";
import { compareCarriers, itineraryMatchesCarriers } from "@/lib/carriers";
import { isoOnLocalDate, startOfLocalDay } from "@/lib/format";
import {
  countTransferKinds,
  indexItineraries,
  itineraryMatchesTransfers,
  sortIndexedItineraries,
} from "@/features/journey/lib/filters";
import {
  encodeShareQuery,
  findItineraryIndex,
  itineraryKey,
  parseShareQuery,
} from "@/features/journey/lib/share";
import { monthCells, shiftDate, splitDateTime } from "@/features/journey/lib/datetime";
import { berlin, manyJourneys, prague } from "@/test/fixtures";

const BOARD = 160;

describe("board stress", () => {
  it("filters, sorts, and compares a packed day's board", () => {
    const journeys = manyJourneys(BOARD);
    const started = performance.now();

    const kinds = countTransferKinds(journeys);
    expect(kinds?.direct).toBeGreaterThan(0);
    expect((kinds?.direct ?? 0) + (kinds?.transfers ?? 0)).toBe(BOARD);

    const indexed = indexItineraries(journeys);
    const transfers = indexed.filter(({ itinerary }) =>
      itineraryMatchesTransfers(itinerary, "transfers"),
    );
    const fastest = sortIndexedItineraries(transfers, "fastest");
    const fewest = sortIndexedItineraries(transfers, "transfers");
    expect(fastest[0]!.itinerary.duration).toBeLessThanOrEqual(
      fastest.at(-1)!.itinerary.duration,
    );
    expect(fewest[0]!.itinerary.transfers).toBeLessThanOrEqual(
      fewest.at(-1)!.itinerary.transfers,
    );

    const carriers = compareCarriers(journeys);
    expect(carriers.length).toBeGreaterThan(1);
    const picked = carriers[0]!.name;
    const matching = journeys.filter((item) =>
      itineraryMatchesCarriers(item, [picked]),
    );
    expect(matching.length).toBe(carriers[0]!.connections);

    const last = journeys.at(-1)!;
    expect(findItineraryIndex(journeys, itineraryKey(last))).toBe(BOARD - 1);
    expect(performance.now() - started).toBeLessThan(80);
  });

  it("round-trips a crowded share desk", () => {
    const journeys = manyJourneys(80);
    const started = performance.now();
    for (const [index, itinerary] of journeys.entries()) {
      const query = encodeShareQuery({
        from: berlin,
        to: prague,
        via: [],
        leaveNow: false,
        datetime: startOfLocalDay("2026-08-14T08:00"),
        arriveBy: index % 7 === 0,
        allDay: index % 3 === 0,
        modeFilter: index % 5 === 0 ? "train" : "all",
        transferFilter: index % 4 === 0 ? "direct" : "all",
        tripKey: itineraryKey(itinerary),
      });
      const parsed = parseShareQuery(`?${query}`);
      expect(parsed?.from.name).toBe("Berlin Hbf");
      expect(parsed?.tripKey).toBe(itineraryKey(itinerary));
    }
    expect(performance.now() - started).toBeLessThan(80);
  });

  it("keeps the paper calendar honest across years", () => {
    let parts = splitDateTime("2024-01-31T00:00");
    for (let month = 0; month < 36; month += 1) {
      const cells = monthCells(parts.year, parts.month);
      expect(cells).toHaveLength(42);
      expect(cells.filter((cell) => cell.inMonth).length).toBeGreaterThanOrEqual(28);
      parts = shiftDate({ ...parts, day: 28 }, 32);
    }
  });

  it("keeps a day's window on the stamped date", () => {
    const stamp = "2026-08-14T00:00";
    const journeys = manyJourneys(BOARD);
    expect(journeys.every((item) => isoOnLocalDate(item.startTime, stamp))).toBe(true);
    expect(isoOnLocalDate("2026-12-01T12:00:00Z", stamp)).toBe(false);
  });
});
