import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { indexItineraries } from "@/features/journey/lib/filters";
import { railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { JourneyResults } from "@/features/journey/components/JourneyResults";

const notice = {
  headerText: "Works on the line",
  descriptionText: "Replacement bus west of Dresden.",
  effect: "MODIFIED_SERVICE",
};

function renderResults(itineraries = [railItinerary()], selectedIndex = 0) {
  const afterTransfers = indexItineraries(itineraries);
  return renderHall(
    <JourneyResults
      loading={false}
      itineraries={itineraries}
      afterTransfers={afterTransfers}
      filtered={afterTransfers}
      selected={itineraries[selectedIndex] ?? null}
      selectedIndex={selectedIndex}
      selectedCarriers={[]}
      transferFilter="all"
      shareUrl=""
      onSelectedCarriersChange={vi.fn()}
      onSelectedIndexChange={vi.fn()}
    />,
  );
}

describe("JourneyResults hall stamps", () => {
  it("prints a hall tape when two tickets share a notice", () => {
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
    renderResults([first, second]);
    expect(screen.getByTestId("hall-tape")).toHaveTextContent("Notice across the hall");
    expect(screen.getByTestId("hall-tape")).toHaveTextContent("Works on the line");
  });

  it("sets two prints side by side after holding one ticket", async () => {
    const user = userEvent.setup();
    const first = railItinerary();
    const second = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      endTime: "2026-08-14T20:30:00Z",
      legs: [{ ...first.legs[0]!, tripId: "trip-ec-178", startTime: "2026-08-14T16:00:00Z" }],
    });
    const afterTransfers = indexItineraries([first, second]);
    const onSelectedIndexChange = vi.fn();
    const { rerender } = renderHall(
      <JourneyResults
        loading={false}
        itineraries={[first, second]}
        afterTransfers={afterTransfers}
        filtered={afterTransfers}
        selected={first}
        selectedIndex={0}
        selectedCarriers={[]}
        transferFilter="all"
        shareUrl=""
        onSelectedCarriersChange={vi.fn()}
        onSelectedIndexChange={onSelectedIndexChange}
      />,
    );

    await user.click(screen.getByTestId("hold-print"));
    expect(screen.queryByTestId("desk-compare")).not.toBeInTheDocument();

    rerender(
      <JourneyResults
        loading={false}
        itineraries={[first, second]}
        afterTransfers={afterTransfers}
        filtered={afterTransfers}
        selected={second}
        selectedIndex={1}
        selectedCarriers={[]}
        transferFilter="all"
        shareUrl=""
        onSelectedCarriersChange={vi.fn()}
        onSelectedIndexChange={onSelectedIndexChange}
      />,
    );

    expect(screen.getByTestId("desk-compare")).toHaveTextContent("Two prints");
    expect(screen.getAllByTestId("carrier-board")).toHaveLength(2);
  });
});
