import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { ItineraryList } from "@/features/journey/components/ItineraryList";

describe("ItineraryList", () => {
  it("prints the ticket and lets you pick another", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const first = railItinerary();
    const second = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      endTime: "2026-08-14T20:30:00Z",
      transfers: 1,
      duration: 16_200,
      legs: [
        {
          ...first.legs[0]!,
          startTime: "2026-08-14T16:00:00Z",
          endTime: "2026-08-14T20:30:00Z",
          displayName: "EC 178",
          routeShortName: "EC 178",
          tripId: "trip-ec-178",
        },
      ],
    });

    renderHall(
      <ItineraryList
        itineraries={[first, second]}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    );

    const tickets = screen.getAllByRole("option");
    expect(tickets[0]).toHaveAttribute("aria-selected", "true");
    expect(tickets[0]).toHaveTextContent("EC 172");
    expect(tickets[0]).toHaveTextContent("Direct");
    expect(tickets[1]).toHaveTextContent("EC 178");
    await user.click(tickets[1]!);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
