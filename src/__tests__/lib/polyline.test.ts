import { describe, expect, it } from "vitest";
import { decodePolyline } from "@/lib/polyline";

describe("decodePolyline", () => {
  it("reads a two-point MOTIS line", () => {
    // Berlin Hbf → Praha hl.n. at precision 6
    const points = decodePolyline("o{zdcBoi~nXnksyAoa`Uncly@o}_j@");
    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points[0]?.[0]).toBeCloseTo(52.525, 3);
    expect(points[0]?.[1]).toBeCloseTo(13.369, 3);
    expect(points.at(-1)?.[0]).toBeCloseTo(50.083, 2);
    expect(points.at(-1)?.[1]).toBeCloseTo(14.435, 2);
  });

  it("returns nothing for a blank geometry", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});
