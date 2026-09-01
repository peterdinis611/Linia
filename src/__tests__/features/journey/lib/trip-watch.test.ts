import { describe, expect, it } from "vitest";
import {
  findWatched,
  watchDelta,
  watchFault,
  watchKey,
} from "@/features/journey/lib/trip-watch";
import { itineraryKey } from "@/features/journey/lib/share";
import { railItinerary } from "@/test/fixtures";

describe("trip watch", () => {
  it("keeps the watch key when the train is late", () => {
    const onTime = railItinerary();
    const late = railItinerary({
      startTime: "2026-08-14T08:12:00Z",
      legs: [
        {
          ...onTime.legs[0]!,
          realTime: true,
          startTime: "2026-08-14T08:12:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    expect(watchKey(late)).toBe(watchKey(onTime));
    expect(watchKey(late)).toBe("trip-ec-172");
    expect(itineraryKey(late)).not.toBe(itineraryKey(onTime));
  });

  it("stamps cancelled, a worse delay, or gone", () => {
    const onTime = railItinerary();
    const prev = watchFault(onTime);
    expect(watchDelta(prev, onTime)).toBeNull();

    const late = railItinerary({
      legs: [
        {
          ...onTime.legs[0]!,
          realTime: true,
          startTime: "2026-08-14T08:12:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    expect(watchDelta(prev, late)).toBe("delay");
    expect(watchDelta(watchFault(late), late)).toBeNull();

    const later = railItinerary({
      legs: [
        {
          ...onTime.legs[0]!,
          realTime: true,
          startTime: "2026-08-14T08:20:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    expect(watchDelta(watchFault(late), later)).toBe("delay");

    const cancelled = railItinerary({
      legs: [{ ...onTime.legs[0]!, cancelled: true }],
    });
    expect(watchDelta(prev, cancelled)).toBe("cancelled");
    expect(watchDelta(prev, null)).toBe("gone");
  });

  it("finds the watched trip among a new board", () => {
    const first = railItinerary();
    const other = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      legs: [{ ...first.legs[0]!, tripId: "trip-ec-178" }],
    });
    const late = railItinerary({
      startTime: "2026-08-14T08:12:00Z",
      legs: [
        {
          ...first.legs[0]!,
          realTime: true,
          startTime: "2026-08-14T08:12:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    expect(findWatched([other, late], watchKey(first))).toBe(late);
    expect(findWatched([other], watchKey(first))).toBeNull();
  });
});
