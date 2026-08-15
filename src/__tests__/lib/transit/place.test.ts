import { describe, expect, it } from "vitest";
import { berlin } from "@/test/fixtures";
import {
  coordPlace,
  isRoutableStop,
  placeToSelected,
} from "@/lib/transit/place";

describe("place helpers", () => {
  it("keeps a stop id when pinning a station", () => {
    expect(
      placeToSelected({
        name: "Berlin Hbf",
        stopId: "stop-berlin",
        lat: 52.525,
        lon: 13.369,
      }),
    ).toMatchObject({
      id: "stop-berlin",
      type: "STOP",
      name: "Berlin Hbf",
    });
  });

  it("falls back to a coordinate pin without a stop id", () => {
    const place = placeToSelected({
      name: "A field",
      lat: 48.1,
      lon: 17.1,
    });
    expect(place.type).toBe("PLACE");
    expect(place.id).toMatch(/^coord:/);
    expect(isRoutableStop(place)).toBe(false);
  });

  it("treats a named stop as routable", () => {
    expect(isRoutableStop(berlin)).toBe(true);
    expect(isRoutableStop(coordPlace(48.1, 17.1))).toBe(false);
  });
});
