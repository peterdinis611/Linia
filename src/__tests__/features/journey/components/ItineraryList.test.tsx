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

  it("stamps a service ribbon on a ticket", () => {
    const first = railItinerary({
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
    renderHall(
      <ItineraryList itineraries={[first]} selectedIndex={0} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("alert-ribbon")).toHaveTextContent("Changed service");
    expect(screen.getByTestId("alert-ribbon")).toHaveTextContent("Replacement bus");
  });

  it("marks a ticket that is on the line right now", () => {
    const origin = Date.now() - 20 * 60_000;
    const live = railItinerary({
      startTime: new Date(origin).toISOString(),
      endTime: new Date(origin + 80 * 60_000).toISOString(),
      legs: [
        {
          ...railItinerary().legs[0]!,
          startTime: new Date(origin).toISOString(),
          endTime: new Date(origin + 80 * 60_000).toISOString(),
        },
      ],
    });
    renderHall(
      <ItineraryList itineraries={[live]} selectedIndex={0} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("option")).toHaveTextContent("On this line");
  });

  it("prints walk time on the ticket, not only in the strip", () => {
    const rail = railItinerary().legs[0]!;
    const walking = railItinerary({
      transfers: 1,
      legs: [
        {
          ...rail,
          mode: "WALK",
          duration: 480,
          startTime: "2026-08-14T07:52:00Z",
          endTime: "2026-08-14T08:00:00Z",
          agencyName: undefined,
          routeShortName: undefined,
          displayName: undefined,
          tripId: undefined,
          intermediateStops: [],
          from: { name: "Street", lat: 52.52, lon: 13.37 },
          to: { name: "Berlin Hbf", lat: 52.525, lon: 13.369 },
        },
        rail,
        {
          ...rail,
          mode: "WALK",
          duration: 720,
          startTime: "2026-08-14T12:30:00Z",
          endTime: "2026-08-14T12:42:00Z",
          agencyName: undefined,
          routeShortName: undefined,
          displayName: undefined,
          tripId: undefined,
          intermediateStops: [],
          from: { name: "Praha hl.n.", lat: 50.083, lon: 14.435 },
          to: { name: "Praha transfer", lat: 50.08, lon: 14.43 },
        },
        {
          ...rail,
          startTime: "2026-08-14T12:42:00Z",
          endTime: "2026-08-14T13:10:00Z",
          from: { name: "Praha transfer", lat: 50.08, lon: 14.43 },
          to: { name: "Praha-Smíchov", lat: 50.075, lon: 14.408 },
        },
      ],
    });
    renderHall(
      <ItineraryList itineraries={[walking]} selectedIndex={0} onSelect={vi.fn()} />,
    );
    const walk = screen.getByTestId("ticket-walk");
    expect(walk).toHaveTextContent("8 min to Berlin Hbf");
    expect(walk).toHaveTextContent("12 min to change");
  });

  it("inks cancelled and delayed stamps on the ticket", () => {
    const broken = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          realTime: true,
          cancelled: true,
          startTime: "2026-08-14T08:12:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    renderHall(
      <ItineraryList itineraries={[broken]} selectedIndex={0} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("ticket-cancelled")).toHaveTextContent("Cancelled");
    expect(screen.getByTestId("ticket-delayed")).toHaveTextContent("+12 min");
    expect(screen.getByRole("option")).toHaveAttribute("data-fault", "true");
  });

  it("stamps the last ticket of the day", () => {
    const first = railItinerary();
    const last = railItinerary({
      startTime: "2026-08-14T21:40:00Z",
      endTime: "2026-08-14T23:10:00Z",
    });
    renderHall(
      <ItineraryList
        itineraries={[first, last]}
        selectedIndex={0}
        lastOfDayKey={`${last.startTime}|${last.endTime}`}
        onSelect={vi.fn()}
      />,
    );
    const tickets = screen.getAllByRole("option");
    expect(tickets[0]).not.toHaveTextContent("Last today");
    expect(tickets[1]).toHaveTextContent("Last today");
  });

  it("inks a platform change on the ticket", () => {
    const moved = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          from: {
            name: "Berlin Hbf",
            lat: 52.525,
            lon: 13.369,
            track: "4",
            scheduledTrack: "12",
          },
        },
      ],
    });
    renderHall(
      <ItineraryList itineraries={[moved]} selectedIndex={0} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("ticket-track")).toHaveTextContent("plat. 4 · was 12");
    expect(screen.getByRole("option")).toHaveAttribute("data-fault", "true");
  });
});
