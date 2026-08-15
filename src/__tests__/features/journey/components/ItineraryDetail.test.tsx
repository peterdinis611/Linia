import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { berlin, prague, railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { ItineraryDetail } from "@/features/journey/components/ItineraryDetail";

describe("ItineraryDetail", () => {
  it("prints a service notice on the strip", () => {
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
    renderHall(<ItineraryDetail itinerary={itinerary} />);
    const notices = screen.getAllByTestId("alert-notice");
    expect(notices.length).toBeGreaterThan(0);
    expect(notices[0]).toHaveTextContent("Changed service");
    expect(notices[0]).toHaveTextContent("Replacement bus");
  });

  it("opens a station board from a stop with an id", async () => {
    const user = userEvent.setup();
    const onOpenStation = vi.fn();
    const itinerary = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          from: {
            name: berlin.name,
            lat: berlin.lat,
            lon: berlin.lon,
            stopId: berlin.id,
          },
          to: {
            name: prague.name,
            lat: prague.lat,
            lon: prague.lon,
            stopId: prague.id,
          },
        },
      ],
    });
    renderHall(
      <ItineraryDetail itinerary={itinerary} onOpenStation={onOpenStation} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Berlin Hbf. Station board" }),
    );
    expect(onOpenStation).toHaveBeenCalledWith(
      expect.objectContaining({ stopId: berlin.id, name: berlin.name }),
    );
  });

  it("leaves a nameless stop as plain text", () => {
    renderHall(<ItineraryDetail itinerary={railItinerary()} />);
    expect(
      screen.queryByRole("button", { name: /Station board/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Berlin Hbf")).toBeInTheDocument();
  });
});
