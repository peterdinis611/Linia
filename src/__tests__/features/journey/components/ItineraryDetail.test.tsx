import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { berlin, dresden, prague, railItinerary } from "@/test/fixtures";
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
    await user.click(screen.getByTestId("board-stamp-from"));
    expect(onOpenStation).toHaveBeenCalledWith(
      expect.objectContaining({ stopId: berlin.id }),
    );
    await user.click(screen.getByTestId("board-stamp-to"));
    expect(onOpenStation).toHaveBeenCalledWith(
      expect.objectContaining({ stopId: prague.id }),
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

  it("prints when the train calls at each station", () => {
    renderHall(<ItineraryDetail itinerary={railItinerary()} />);
    const call = screen.getByTestId("call-at");
    expect(call).toHaveTextContent("Dresden Hbf");
    expect(call).toHaveTextContent("Arrives");
    expect(call).toHaveTextContent("Departs");
    expect(screen.getByTestId("call-board")).toBeVisible();
  });

  it("fetches trip stops as soon as the ticket is selected", async () => {
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

    expect(fetchTrip).toHaveBeenCalledWith("trip-ec-172");
    expect(await screen.findByText("Dresden Hbf")).toBeInTheDocument();
    expect(screen.getByTestId("call-at")).toHaveTextContent("Arrives");
  });

  it("opens a transfer board from a change of trains", async () => {
    fetchTrip.mockResolvedValue(railItinerary());
    const user = userEvent.setup();
    const onOpenStation = vi.fn();
    const rail = railItinerary().legs[0]!;
    const itinerary = railItinerary({
      transfers: 1,
      legs: [
        {
          ...rail,
          from: {
            name: berlin.name,
            lat: berlin.lat,
            lon: berlin.lon,
            stopId: berlin.id,
          },
          to: {
            name: dresden.name,
            lat: dresden.lat,
            lon: dresden.lon,
            stopId: dresden.id,
          },
          intermediateStops: [],
        },
        {
          ...rail,
          startTime: "2026-08-14T10:20:00Z",
          endTime: "2026-08-14T12:30:00Z",
          from: {
            name: dresden.name,
            lat: dresden.lat,
            lon: dresden.lon,
            stopId: dresden.id,
          },
          to: {
            name: prague.name,
            lat: prague.lat,
            lon: prague.lon,
            stopId: prague.id,
          },
          intermediateStops: [],
        },
      ],
    });
    renderHall(
      <ItineraryDetail itinerary={itinerary} onOpenStation={onOpenStation} />,
    );

    await user.click(screen.getByTestId("board-stamp-change"));
    expect(onOpenStation).toHaveBeenCalledWith(
      expect.objectContaining({ stopId: dresden.id, name: dresden.name }),
    );
  });

  it("stamps a platform change on the strip", () => {
    const itinerary = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          from: {
            name: berlin.name,
            lat: berlin.lat,
            lon: berlin.lon,
            track: "4",
            scheduledTrack: "12",
          },
        },
      ],
    });
    renderHall(<ItineraryDetail itinerary={itinerary} />);
    expect(screen.getByTestId("detail-track-from")).toHaveTextContent(
      "plat. 4 · was 12",
    );
  });
});
