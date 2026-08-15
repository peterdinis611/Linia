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
});
