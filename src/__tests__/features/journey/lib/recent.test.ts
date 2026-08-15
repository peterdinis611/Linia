import { describe, expect, it } from "vitest";
import { berlin, dresden, prague } from "@/test/fixtures";
import { mergeRecent, type RecentSearch } from "@/features/journey/lib/recent";

const first: RecentSearch = {
  from: berlin,
  to: prague,
  via: [],
  savedAt: 1,
};

describe("recent tickets", () => {
  it("keeps one row per route and puts the latest on top", () => {
    const next = mergeRecent({ from: berlin, to: prague, via: [] }, [first], 9);
    expect(next).toHaveLength(1);
    expect(next[0]?.savedAt).toBe(9);
  });

  it("treats a via stop as a different ticket", () => {
    const next = mergeRecent({ from: berlin, to: prague, via: [dresden] }, [first], 2);
    expect(next).toHaveLength(2);
    expect(next[0]?.via).toEqual([dresden]);
    expect(next[1]).toEqual(first);
  });

  it("caps the board at six tickets", () => {
    const packed = Array.from({ length: 6 }, (_, index) => ({
      from: berlin,
      to: {
        ...prague,
        id: `stop-${index}`,
        name: `Stop ${index}`,
        lat: prague.lat + index,
        lon: prague.lon + index,
      },
      via: [],
      savedAt: index,
    }));
    const next = mergeRecent({ from: berlin, to: prague, via: [] }, packed, 20);
    expect(next).toHaveLength(6);
    expect(next[0]?.to.id).toBe(prague.id);
  });
});
