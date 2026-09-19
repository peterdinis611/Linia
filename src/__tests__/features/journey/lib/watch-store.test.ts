import { describe, expect, it } from "vitest";
import { watchUntilMorning, watchStillHolds } from "@/features/journey/lib/watch-store";

describe("watch store", () => {
  it("holds until the next local morning", () => {
    const evening = Date.parse("2026-08-14T21:40:00");
    const until = watchUntilMorning(evening);
    expect(watchStillHolds(until, evening)).toBe(true);
    expect(watchStillHolds(until, until - 1)).toBe(true);
    expect(watchStillHolds(until, until)).toBe(false);
    const morning = new Date(evening);
    morning.setHours(24, 0, 0, 0);
    expect(until).toBe(morning.getTime());
  });
});
