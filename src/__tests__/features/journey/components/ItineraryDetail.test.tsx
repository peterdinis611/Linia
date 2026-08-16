import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { berlin, prague, railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { ItineraryDetail } from "@/features/journey/components/ItineraryDetail";

const fetchTrip = vi.hoisted(() => vi.fn());

vi.mock("@/lib/transit/queries", () => ({
  fetchTrip,
}));

describe("ItineraryDetail", () => {
  beforeEach(() => {
    fetchTrip.mockReset();
  });
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

  it("stamps now on the live stretch of the strip", () => {
    const origin = Date.now() - 30 * 60_000;
    const itinerary = railItinerary({
      startTime: new Date(origin).toISOString(),
      endTime: new Date(origin + 90 * 60_000).toISOString(),
      legs: [
        {
          ...railItinerary().legs[0]!,
          startTime: new Date(origin).toISOString(),
          endTime: new Date(origin + 90 * 60_000).toISOString(),
        },
      ],
    });
    renderHall(<ItineraryDetail itinerary={itinerary} />);
    expect(screen.getByTestId("leg-now")).toHaveTextContent("Now");
  });

  it("does not fetch trip stops until the stamp is pressed", async () => {
    const user = userEvent.setup();
    fetchTrip.mockResolvedValue(railItinerary());
    const itinerary = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          intermediateStops: [],
        },
      ],
    });
    renderHall(<ItineraryDetail itinerary={itinerary} />);

    expect(fetchTrip).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("load-stops"));
    expect(fetchTrip).toHaveBeenCalledWith("trip-ec-172");
    expect(await screen.findByText("1 stop")).toBeInTheDocument();
  });
});
