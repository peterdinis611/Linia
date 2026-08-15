import { describe, expect, it } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  alertEffectKey,
  alertsFromItinerary,
  alertsFromStopTime,
  itineraryHasAlerts,
  uniqueAlerts,
} from "@/features/journey/lib/alerts";
import type { StopTimeEvent } from "@/lib/transit/types";

describe("alerts", () => {
  it("maps known effects and drops blanks", () => {
    expect(alertEffectKey("MODIFIED_SERVICE")).toBe(
      "alerts.effects.MODIFIED_SERVICE",
    );
    expect(alertEffectKey("WEIRD")).toBe("alerts.kicker");
    expect(
      uniqueAlerts([
        { headerText: "A", descriptionText: "B", effect: "NO_SERVICE" },
        { headerText: "A", descriptionText: "B", effect: "NO_SERVICE" },
        { headerText: "  ", descriptionText: "  " },
      ]),
    ).toHaveLength(1);
  });

  it("collects alerts from legs and stops", () => {
    const itinerary = railItinerary({
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
          from: {
            ...railItinerary().legs[0]!.from,
            alerts: [
              {
                headerText: "Platform change",
                descriptionText: "Use 12.",
                effect: "STOP_MOVED",
              },
            ],
          },
          intermediateStops: [
            {
              ...railItinerary().legs[0]!.intermediateStops![0]!,
              alerts: [
                {
                  headerText: "Replacement bus",
                  descriptionText: "Rail replacement.",
                  effect: "MODIFIED_SERVICE",
                },
              ],
            },
          ],
        },
      ],
    });
    const notices = alertsFromItinerary(itinerary);
    expect(notices).toHaveLength(2);
    expect(notices.map((alert) => alert.headerText)).toEqual([
      "Replacement bus",
      "Platform change",
    ]);
    expect(itineraryHasAlerts(itinerary)).toBe(true);
    expect(itineraryHasAlerts(railItinerary())).toBe(false);
  });

  it("collects a notice from a departure row", () => {
    const event: StopTimeEvent = {
      place: {
        name: "Berlin Hbf",
        lat: 52.525,
        lon: 13.369,
        departure: "2026-08-14T08:00:00Z",
        alerts: [
          {
            headerText: "On the platform",
            descriptionText: "Queue at 12.",
            effect: "OTHER_EFFECT",
          },
        ],
      },
      mode: "RAIL",
      realTime: false,
      displayName: "EC 172",
      alerts: [
        {
          headerText: "On the trip",
          descriptionText: "Rail replacement.",
          effect: "MODIFIED_SERVICE",
        },
      ],
    };
    expect(alertsFromStopTime(event).map((alert) => alert.headerText)).toEqual([
      "On the trip",
      "On the platform",
    ]);
  });
});
