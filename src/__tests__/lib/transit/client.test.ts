import { describe, expect, it } from "vitest";
import { berlin } from "@/test/fixtures";
import { placeQueryParam, transitModesFor } from "@/lib/transit/client";
import { coordPlace } from "@/lib/transit/place";

describe("MOTIS query helpers", () => {
  it("sends a stop id when the pin is a station", () => {
    expect(placeQueryParam(berlin)).toBe(berlin.id);
    expect(placeQueryParam(coordPlace(48.1486, 17.1077))).toBe("48.1486,17.1077");
  });

  it("narrows the line to rail or coach", () => {
    expect(transitModesFor("all")).toBeUndefined();
    expect(transitModesFor("train")).toContain("RAIL");
    expect(transitModesFor("train")).toContain("NIGHT_RAIL");
    expect(transitModesFor("bus")).toBe("BUS,COACH");
  });

  it("stamps night rail as a filter, not a third mode", () => {
    expect(transitModesFor("all", { night: true })).toBe("NIGHT_RAIL");
    expect(transitModesFor("train", { night: true })).toBe("NIGHT_RAIL");
    expect(transitModesFor("bus", { night: true })).toBe("NIGHT_RAIL");
  });
});
