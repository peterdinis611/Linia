import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { CarrierCompare } from "@/features/journey/components/CarrierCompare";

describe("CarrierCompare", () => {
  it("prints operator stamps instead of truncated chips", async () => {
    const user = userEvent.setup();
    const onSelectedCarriersChange = vi.fn();
    const onJumpToItinerary = vi.fn();
    const db = railItinerary();
    const zssk = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      legs: [
        {
          ...db.legs[0]!,
          agencyName: "Železničná spoločnosť Slovensko, a.s.",
          tripId: "trip-sc-241",
        },
      ],
    });

    renderHall(
      <CarrierCompare
        itineraries={[db, zssk]}
        selectedCarriers={[]}
        onSelectedCarriersChange={onSelectedCarriersChange}
        onJumpToItinerary={onJumpToItinerary}
      />,
    );

    const desk = screen.getByTestId("carrier-desk");
    expect(desk).toHaveTextContent("Compare operators");
    expect(desk).toHaveTextContent("ZSSK");
    expect(desk).not.toHaveTextContent("Železničná spoločnosť Slovensko, a.s.");
    expect(screen.getByRole("button", { name: "Show all carriers" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: zssk.legs[0]!.agencyName }));
    expect(onSelectedCarriersChange).toHaveBeenCalledWith([
      "Železničná spoločnosť Slovensko, a.s.",
    ]);
    expect(onJumpToItinerary).toHaveBeenCalledWith(1);
  });
});
