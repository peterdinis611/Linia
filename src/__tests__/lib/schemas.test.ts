import { describe, expect, it } from "vitest";
import { berlin, prague, railItinerary } from "@/test/fixtures";
import {
  fieldErrorsFromZod,
  itinerarySchema,
  journeySearchFormSchema,
  stopTimeEventSchema,
  stopTimesInputSchema,
  transitAlertSchema,
} from "@/lib/schemas";

const base = {
  from: berlin,
  to: prague,
  via: [],
  time: "2026-08-14T08:30",
  leaveNow: true,
  arriveBy: false,
  allDay: false,
  modeFilter: "all" as const,
  transferFilter: "all" as const,
};

describe("journeySearchFormSchema", () => {
  it("accepts a point-to-point ticket", () => {
    expect(journeySearchFormSchema.safeParse(base).success).toBe(true);
  });

  it("needs a city before a suburban stamp", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      distanceFilter: "suburban",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).city).toBe(
        "validation.cityRequired",
      );
    }
  });

  it("accepts a suburban ticket once a city is stamped", () => {
    expect(
      journeySearchFormSchema.safeParse({
        ...base,
        distanceFilter: "suburban",
        city: berlin,
      }).success,
    ).toBe(true);
  });

  it("needs a destination on a suburban ticket", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      from: null,
      to: null,
      distanceFilter: "suburban",
      city: berlin,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).to).toBe(
        "validation.destinationRequired",
      );
    }
  });

  it("lets the city stand in as suburban destination", () => {
    expect(
      journeySearchFormSchema.safeParse({
        ...base,
        to: null,
        distanceFilter: "suburban",
        city: prague,
      }).success,
    ).toBe(true);
  });

  it("lets the city stand in as suburban origin", () => {
    expect(
      journeySearchFormSchema.safeParse({
        ...base,
        from: null,
        distanceFilter: "suburban",
        city: berlin,
      }).success,
    ).toBe(true);
  });

  it("lets the station board skip a destination", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
      board: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("still needs an origin on the station board", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      from: null,
      to: null,
      board: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).from).toBe(
        "validation.originRequired",
      );
    }
  });

  it("needs a destination unless the board is stamped", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).to).toBe(
        "validation.destinationRequired",
      );
    }
  });

  it("needs a return stamp time", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      wantReturn: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).returnTime).toBe(
        "validation.returnTimeRequired",
      );
    }
  });

  it("rejects a return that leaves before the outbound", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      leaveNow: false,
      time: "2026-08-16T10:00",
      wantReturn: true,
      returnTime: "2026-08-15T08:00",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).returnTime).toBe(
        "validation.returnAfterOutbound",
      );
    }
  });

  it("accepts a return after the outbound", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      leaveNow: false,
      wantReturn: true,
      returnTime: "2026-08-16T14:00",
      accessible: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts bike and night stamps", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      bike: true,
      night: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bike).toBe(true);
      expect(parsed.data.night).toBe(true);
    }
  });

  it("ignores a missing return time on the station board", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
      board: true,
      wantReturn: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects the same station as both ends", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: berlin,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromZod(parsed.error).to).toBe(
        "validation.placesDifferent",
      );
    }
  });
});

describe("stopTimesInputSchema", () => {
  it("accepts a station board request", () => {
    const parsed = stopTimesInputSchema.safeParse({
      stop: berlin,
      arriveBy: true,
      modeFilter: "train",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.n).toBe(20);
      expect(parsed.data.arriveBy).toBe(true);
    }
  });
});

describe("transit notices", () => {
  it("fills blank alert copy", () => {
    const parsed = transitAlertSchema.safeParse({ effect: "NO_SERVICE" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.headerText).toBe("");
      expect(parsed.data.descriptionText).toBe("");
    }
  });

  it("keeps a notice on a journey and a departure", () => {
    const itinerary = itinerarySchema.safeParse(
      railItinerary({
        legs: [
          {
            ...railItinerary().legs[0]!,
            alerts: [
              {
                headerText: "Replacement bus",
                descriptionText: "Rail replacement.",
                effect: "MODIFIED_SERVICE",
              },
            ],
          },
        ],
      }),
    );
    expect(itinerary.success).toBe(true);
    if (itinerary.success) {
      expect(itinerary.data.legs[0]?.alerts?.[0]?.effect).toBe("MODIFIED_SERVICE");
    }

    const event = stopTimeEventSchema.safeParse({
      place: {
        name: berlin.name,
        lat: berlin.lat,
        lon: berlin.lon,
        departure: "2026-08-14T08:00:00Z",
        alerts: [{ headerText: "Platform change", descriptionText: "Use 12." }],
      },
      mode: "RAIL",
      displayName: "EC 172",
    });
    expect(event.success).toBe(true);
    if (event.success) {
      expect(event.data.place.alerts?.[0]?.headerText).toBe("Platform change");
    }
  });
});
