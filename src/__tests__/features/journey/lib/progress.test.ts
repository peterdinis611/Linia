import { describe, expect, it } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  currentStopIndex,
  itineraryIsLive,
  legPhase,
} from "@/features/journey/lib/progress";

const start = Date.parse("2026-08-14T08:00:00Z");
const mid = Date.parse("2026-08-14T10:02:00Z");
const after = Date.parse("2026-08-14T13:00:00Z");

describe("journey strip progress", () => {
  it("marks a leg as past, current or upcoming", () => {
    const leg = railItinerary().legs[0]!;
    expect(legPhase(leg, start - 1_000)).toBe("upcoming");
    expect(legPhase(leg, mid)).toBe("current");
    expect(legPhase(leg, after)).toBe("past");
  });

  it("knows when the ticket is live", () => {
    const itinerary = railItinerary();
    expect(itineraryIsLive(itinerary, start)).toBe(true);
    expect(itineraryIsLive(itinerary, after)).toBe(false);
    expect(itineraryIsLive(itinerary, start - 1)).toBe(false);
  });

  it("points at the last stop already passed", () => {
    const stops = railItinerary().legs[0]!.intermediateStops ?? [];
    expect(currentStopIndex(stops, Date.parse("2026-08-14T09:00:00Z"))).toBe(-1);
    expect(currentStopIndex(stops, mid)).toBe(0);
  });
});
