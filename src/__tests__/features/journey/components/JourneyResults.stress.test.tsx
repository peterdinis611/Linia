import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  indexItineraries,
  itineraryMatchesTransfers,
} from "@/features/journey/lib/filters";
import { manyJourneys } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { JourneyResults } from "@/features/journey/components/JourneyResults";

describe("JourneyResults stress", () => {
  it("prints a packed board and survives a burst of stamps", async () => {
    const user = userEvent.setup();
    const journeys = manyJourneys(72);
    const afterTransfers = indexItineraries(journeys).filter(({ itinerary }) =>
      itineraryMatchesTransfers(itinerary, "all"),
    );
    const onSelectedIndexChange = vi.fn();
    const onSelectedCarriersChange = vi.fn();
    const onTimeShift = vi.fn();
    const onRefresh = vi.fn();

    const started = performance.now();
    renderHall(
      <JourneyResults
        loading={false}
        itineraries={journeys}
        afterTransfers={afterTransfers}
        filtered={afterTransfers}
        selected={journeys[0]!}
        selectedIndex={0}
        selectedCarriers={[]}
        transferFilter="all"
        shareUrl=""
        liveAt={Date.now()}
        liveFresh
        onSelectedCarriersChange={onSelectedCarriersChange}
        onSelectedIndexChange={onSelectedIndexChange}
        onRefresh={onRefresh}
        onTimeShift={onTimeShift}
      />,
    );

    expect(screen.getByTestId("journey-results")).toHaveTextContent("72 connections");
    expect(screen.getAllByRole("option")).toHaveLength(72);
    expect(performance.now() - started).toBeLessThan(1_200);

    await user.click(screen.getByTestId("sort-fastest"));
    await user.click(screen.getByTestId("sort-transfers"));
    await user.click(screen.getByTestId("sort-depart"));
    await user.click(screen.getByTestId("later-connections"));
    await user.click(screen.getByTestId("earlier-connections"));
    await user.click(screen.getByTestId("refresh-live"));
    await user.click(screen.getAllByRole("option").at(-1)!);

    expect(onTimeShift).toHaveBeenCalledWith("later");
    expect(onTimeShift).toHaveBeenCalledWith("earlier");
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onSelectedIndexChange).toHaveBeenCalled();
  });

  it("keeps the board readable while a fresh search runs", () => {
    const journeys = manyJourneys(3);
    const afterTransfers = indexItineraries(journeys);
    renderHall(
      <JourneyResults
        loading
        itineraries={journeys}
        afterTransfers={afterTransfers}
        filtered={afterTransfers}
        selected={journeys[0]!}
        selectedIndex={0}
        selectedCarriers={[]}
        transferFilter="all"
        shareUrl=""
        onSelectedCarriersChange={vi.fn()}
        onSelectedIndexChange={vi.fn()}
      />,
    );

    const board = screen.getByTestId("journey-results");
    expect(board).toHaveAttribute("aria-busy", "true");
    expect(board.querySelector(".searching-ribbon")).toBeTruthy();
    expect(board).toHaveTextContent("3 connections");
  });
});
