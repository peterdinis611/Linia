import { describe, expect, it } from "vitest";
import { railItinerary } from "@/test/fixtures";
import {
  alertEffectKey,
  alertsFromItinerary,
  uniqueAlerts,
} from "@/features/journey/lib/alerts";

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
        },
      ],
    });
    expect(alertsFromItinerary(itinerary)[0]?.headerText).toBe("Replacement bus");
  });
});
