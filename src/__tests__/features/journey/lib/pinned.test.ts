import { describe, expect, it } from "vitest";
import { berlin, dresden, prague } from "@/test/fixtures";
import {
  dropPinned,
  mergePinned,
  pinnedOnRoute,
  type PinnedSearch,
} from "@/features/journey/lib/pinned";

const home: PinnedSearch = {
  role: "home",
  from: berlin,
  to: prague,
  via: [],
  savedAt: 1,
};

describe("pinned lines", () => {
  it("keeps one stamp per role and puts the latest on top", () => {
    const next = mergePinned(
      { role: "home", from: berlin, to: dresden, via: [] },
      [home],
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.to.id).toBe(dresden.id);
    expect(next[0]?.role).toBe("home");
  });

  it("replaces a line that already sits on the same route", () => {
    const next = mergePinned({ role: "work", from: berlin, to: prague, via: [] }, [
      home,
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]?.role).toBe("work");
  });

  it("keeps home, work and one other line", () => {
    const packed = mergePinned(
      { role: "line", from: berlin, to: dresden, via: [] },
      mergePinned({ role: "work", from: prague, to: dresden, via: [] }, [home]),
    );
    expect(packed).toHaveLength(3);
    expect(packed.map((item) => item.role)).toEqual(["line", "work", "home"]);
  });

  it("finds a pin on the current ticket", () => {
    expect(pinnedOnRoute([home], { from: berlin, to: prague, via: [] })?.role).toBe(
      "home",
    );
    expect(
      pinnedOnRoute([home], { from: berlin, to: prague, via: [dresden] }),
    ).toBeNull();
  });

  it("drops a role from the board", () => {
    expect(dropPinned([home], "home")).toEqual([]);
    expect(dropPinned([home], "work")).toEqual([home]);
  });
});
