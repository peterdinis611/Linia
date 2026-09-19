import { describe, expect, it } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  alertEffectKey,
  alertsFromItinerary,
  alertsFromStopTime,
  hallAlertsFromBoard,
  hallAlertsFromItineraries,
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

  it("stamps a hall ribbon when the same notice sits on two tickets", () => {
    const notice = {
      headerText: "Strike",
      descriptionText: "No trains west of Dresden.",
      effect: "NO_SERVICE",
    };
    const first = railItinerary({
      legs: [{ ...railItinerary().legs[0]!, alerts: [notice] }],
    });
    const second = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      legs: [
        {
          ...railItinerary().legs[0]!,
          startTime: "2026-08-14T16:00:00Z",
          tripId: "trip-ec-178",
          alerts: [notice],
        },
      ],
    });
    expect(hallAlertsFromItineraries([first])).toHaveLength(0);
    expect(hallAlertsFromItineraries([first, second])).toEqual([notice]);
  });

  it("prints a station notice across the board even on one row", () => {
    const station = {
      headerText: "Hall closed",
      descriptionText: "Use the side entrance.",
      effect: "STOP_MOVED",
    };
    const trip = {
      headerText: "This train only",
      descriptionText: "Short set.",
      effect: "REDUCED_SERVICE",
    };
    const event: StopTimeEvent = {
      place: {
        name: "Berlin Hbf",
        lat: 52.525,
        lon: 13.369,
        departure: "2026-08-14T08:00:00Z",
        alerts: [station],
      },
      mode: "RAIL",
      realTime: false,
      displayName: "EC 172",
      alerts: [trip],
    };
    expect(hallAlertsFromBoard([event]).map((alert) => alert.headerText)).toEqual([
      "Hall closed",
    ]);
    expect(
      hallAlertsFromBoard([event, { ...event, tripId: "trip-2", alerts: [trip] }]).map(
        (alert) => alert.headerText,
      ),
    ).toEqual(["Hall closed", "This train only"]);
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
