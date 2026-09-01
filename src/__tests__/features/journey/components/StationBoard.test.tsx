import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { StationBoard } from "@/features/journey/components/StationBoard";
import type { StopTimeEvent } from "@/lib/transit/types";

const event: StopTimeEvent = {
  place: {
    name: "Berlin Hbf",
    lat: 52.525,
    lon: 13.369,
    departure: "2026-08-14T08:00:00Z",
    track: "12",
  },
  mode: "RAIL",
  realTime: false,
  headsign: "Praha hl.n.",
  agencyName: "Deutsche Bahn",
  displayName: "EC 172",
  tripId: "trip-ec-172",
  cancelled: false,
};

describe("StationBoard", () => {
  it("prints a departure and lets you pick it", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderHall(
      <StationBoard
        stopTimes={[event]}
        arriveBy={false}
        selectedTripId={null}
        onSelect={onSelect}
      />,
    );

    const row = screen.getByTestId("station-row-0");
    expect(row).toHaveTextContent("EC 172");
    expect(row).toHaveTextContent("to Praha hl.n.");
    await user.click(row);
    expect(onSelect).toHaveBeenCalledWith(event);
  });

  it("prints arrivals, delay, a cancellation, and a notice", () => {
    const delayed: StopTimeEvent = {
      ...event,
      realTime: true,
      place: {
        ...event.place,
        departure: "2026-08-14T08:12:00Z",
        scheduledDeparture: "2026-08-14T08:00:00Z",
      },
      cancelled: true,
      alerts: [
        {
          headerText: "Replacement bus",
          descriptionText: "Rail replacement.",
          effect: "MODIFIED_SERVICE",
        },
      ],
    };
    renderHall(
      <StationBoard
        stopTimes={[delayed]}
        arriveBy
        selectedTripId="trip-ec-172"
        onSelect={vi.fn()}
      />,
    );

    const board = screen.getByTestId("station-board");
    expect(board).toHaveAttribute("aria-label", "What arrives here");
    const row = screen.getByTestId("station-row-0");
    expect(row).toHaveAttribute("aria-selected", "true");
    expect(row).toHaveTextContent("Cancelled");
    expect(row).toHaveTextContent("+12 min");
    expect(row).toHaveAttribute("data-fault", "true");
    expect(screen.getByTestId("board-cancelled")).toHaveClass("ticket-fault");
    expect(screen.getByTestId("board-delayed")).toHaveClass("ticket-fault");
    expect(screen.getByTestId("alert-ribbon")).toHaveTextContent("Changed service");
  });

  it("inks a platform change as a red stamp", () => {
    const moved: StopTimeEvent = {
      ...event,
      place: {
        ...event.place,
        track: "4",
        scheduledTrack: "12",
      },
    };
    renderHall(
      <StationBoard
        stopTimes={[moved]}
        arriveBy={false}
        selectedTripId={null}
        onSelect={vi.fn()}
      />,
    );
    const row = screen.getByTestId("station-row-0");
    expect(row).toHaveAttribute("data-fault", "true");
    expect(screen.getByTestId("board-track")).toHaveTextContent("plat. 4 · was 12");
    expect(row).not.toHaveTextContent("plat. 12");
  });

  it("counts down on the selected departure still waiting", () => {
    const soon: StopTimeEvent = {
      ...event,
      tripId: "trip-soon",
      place: {
        ...event.place,
        departure: new Date(Date.now() + 6 * 60_000).toISOString(),
      },
    };
    renderHall(
      <StationBoard
        stopTimes={[soon, event]}
        arriveBy={false}
        selectedTripId="trip-soon"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId("board-soon")).toHaveTextContent("in 6 min");
    expect(screen.getByTestId("station-row-1")).not.toHaveTextContent("in 6 min");
  });
});
