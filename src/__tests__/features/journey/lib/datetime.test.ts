import { describe, expect, it } from "vitest";
import {
  joinDateTime,
  monthCells,
  sameDay,
  shiftDate,
  splitDateTime,
} from "@/features/journey/lib/datetime";

describe("datetime", () => {
  it("splits and joins a hall stamp", () => {
    const parts = splitDateTime("2026-08-14T21:45");
    expect(parts).toEqual({
      year: 2026,
      month: 8,
      day: 14,
      hour: 21,
      minute: 45,
    });
    expect(joinDateTime(parts)).toBe("2026-08-14T21:45");
  });

  it("shifts across a month", () => {
    expect(shiftDate(splitDateTime("2026-08-31T08:00"), 1)).toMatchObject({
      year: 2026,
      month: 9,
      day: 1,
    });
  });

  it("builds a six-week paper calendar", () => {
    const cells = monthCells(2026, 8);
    expect(cells).toHaveLength(42);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
    expect(sameDay(cells.find((cell) => cell.inMonth)!, { year: 2026, month: 8, day: 1 })).toBe(
      true,
    );
  });
});
