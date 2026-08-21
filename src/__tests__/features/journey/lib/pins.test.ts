import { describe, expect, it } from "vitest";
import { berlin, dresden, prague } from "@/test/fixtures";
import {
  canPinVia,
  nextPickAfter,
  otherEnd,
  placesAfterPin,
  roleForMapClick,
  upsertViaList,
} from "@/features/journey/lib/pins";

describe("map pins", () => {
  it("fills origin, then destination, then a stop between them", () => {
    const empty = { from: null, to: null, via: [] };
    expect(roleForMapClick("idle", empty)).toBe("from");

    const afterFrom = placesAfterPin("from", berlin, empty);
    expect(roleForMapClick("idle", afterFrom)).toBe("to");
    expect(nextPickAfter("from", afterFrom)).toBe("to");

    const afterTo = placesAfterPin("to", prague, afterFrom);
    expect(roleForMapClick("idle", afterTo)).toBe("via");
    expect(nextPickAfter("to", afterTo)).toBe("idle");

    const afterVia = placesAfterPin("via", dresden, afterTo);
    expect(afterVia.via).toEqual([dresden]);
    expect(nextPickAfter("via", afterVia)).toBe("via");
    expect(canPinVia(afterVia.via)).toBe(true);
  });

  it("keeps an armed stamp instead of guessing", () => {
    const places = { from: berlin, to: prague, via: [] };
    expect(roleForMapClick("from", places)).toBe("from");
    expect(roleForMapClick("to", places)).toBe("to");
    expect(roleForMapClick("via", places)).toBe("via");
  });

  it("stops adding vias when the paper is full", () => {
    const full = {
      from: berlin,
      to: prague,
      via: [dresden, { ...dresden, id: "stop-leipzig", name: "Leipzig Hbf" }],
    };
    expect(roleForMapClick("idle", full)).toBe("pending");
    expect(nextPickAfter("via", full)).toBe("idle");
    expect(canPinVia(full.via)).toBe(false);
  });

  it("fills an empty via slot before appending", () => {
    expect(upsertViaList([null], dresden)).toEqual([dresden]);
    expect(upsertViaList([dresden], prague)).toEqual([dresden, prague]);
    expect(upsertViaList([dresden, prague], berlin)).toEqual([dresden, berlin]);
  });

  it("uses the city as the other pin when destination is empty", () => {
    expect(otherEnd({ from: berlin, to: null, city: prague })).toEqual(prague);
    expect(otherEnd({ from: berlin, to: dresden, city: prague })).toEqual(dresden);
    expect(otherEnd({ from: berlin, to: null, city: berlin })).toBeNull();
  });
});
