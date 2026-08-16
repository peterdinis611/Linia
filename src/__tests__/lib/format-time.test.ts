import { describe, expect, it } from "vitest";
import {
  isoOnLocalDate,
  parseHallDateTime,
  startOfLocalDay,
  toLocalDateTimeValue,
} from "@/lib/format";

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
