import { describe, expect, it } from "vitest";
import { itinerarySchema } from "@/lib/schemas";
import { railItinerary } from "@/test/fixtures";

describe("wheelchairAccessible MOTIS stamps", () => {
  it("coerces ACCESSIBLE / NOT_ACCESSIBLE strings so transit legs parse", () => {
    const base = railItinerary();
    const raw = {
      ...base,
      legs: [
        {
          ...base.legs[0]!,
          wheelchairAccessible: "ACCESSIBLE",
        },
        {
          ...base.legs[0]!,
          mode: "WALK",
          wheelchairAccessible: "NOT_ACCESSIBLE",
        },
      ],
    };
    const parsed = itinerarySchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.legs[0]?.wheelchairAccessible).toBe(true);
    expect(parsed.data.legs[1]?.wheelchairAccessible).toBe(false);
  });

  it("keeps boolean values and drops unknown stamps", () => {
    const base = railItinerary();
    const parsed = itinerarySchema.safeParse({
      ...base,
      legs: [
        { ...base.legs[0]!, wheelchairAccessible: true },
        { ...base.legs[0]!, wheelchairAccessible: "NO_DATA" },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.legs[0]?.wheelchairAccessible).toBe(true);
    expect(parsed.data.legs[1]?.wheelchairAccessible).toBeUndefined();
  });
});
