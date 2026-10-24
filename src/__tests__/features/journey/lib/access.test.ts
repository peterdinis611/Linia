import { describe, expect, it } from "vitest";
import {
  accessNotesForLeg,
  itineraryAccessNotes,
} from "@/features/journey/lib/access";
import { railItinerary } from "@/test/fixtures";

describe("access", () => {
  it("stamps wheelchair and elevator notes when MOTIS sends them", () => {
    const base = railItinerary().legs[0]!;
    const leg = {
      ...base,
      wheelchairAccessible: true,
      steps: [
        { relativeDirection: "ELEVATOR", distance: 12 },
        { relativeDirection: "ELEVATOR", distance: 8 },
      ],
      from: { ...base.from, level: 0 },
      to: { ...base.to, level: 1 },
    };
    const notes = accessNotesForLeg(leg);
    expect(notes.map((note) => note.labelKey)).toEqual([
      "detail.wheelchairOk",
      "detail.elevator",
      "detail.levelChange",
    ]);
    expect(notes.find((note) => note.kind === "elevator")?.params).toEqual({
      count: 2,
    });
  });

  it("dedupes itinerary-wide access notes", () => {
    const itinerary = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          wheelchairAccessible: false,
        },
        {
          ...railItinerary().legs[0]!,
          wheelchairAccessible: false,
        },
      ],
    });
    expect(itineraryAccessNotes(itinerary)).toHaveLength(1);
    expect(itineraryAccessNotes(itinerary)[0]?.labelKey).toBe(
      "detail.wheelchairNo",
    );
  });
});
