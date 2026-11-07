import { beforeEach, describe, expect, it, vi } from "vitest";

describe("hall idb reactivity", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
  });

  it("notifies same-tab subscribers without waiting for BroadcastChannel", async () => {
    const { publishHall, subscribeHall } = await import("@/lib/idb");
    const seen: string[] = [];
    const stop = subscribeHall("recent", () => {
      seen.push("recent");
    });
    publishHall("recent");
    publishHall("prefs");
    expect(seen).toEqual(["recent"]);
    stop();
  });

  it("commits recent snapshots reactively in memory when idb is unavailable", async () => {
    const { rememberSearch, getRecentSearchesSnapshot, subscribeRecentSearches } =
      await import("@/features/journey/lib/recent");
    const berlin = {
      id: "a",
      name: "Berlin",
      lat: 52.5,
      lon: 13.4,
      type: "STOP" as const,
    };
    const prague = {
      id: "b",
      name: "Prague",
      lat: 50.1,
      lon: 14.4,
      type: "STOP" as const,
    };
    const ticks: number[] = [];
    const stop = subscribeRecentSearches((items) => {
      ticks.push(items.length);
    });
    await rememberSearch({ from: berlin, to: prague, via: [] });
    expect(getRecentSearchesSnapshot()).toHaveLength(1);
    expect(ticks.at(-1)).toBe(1);
    stop();
  });
});
