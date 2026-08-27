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
    expect(screen.getByTestId("carrier-ledger")).toHaveTextContent("Fastest");
    expect(screen.getByTestId("carrier-ledger")).toHaveTextContent("Time");
    expect(screen.getByTestId("carrier-ledger")).toHaveTextContent("4h 30");
    expect(screen.getByTestId("carrier-ledger")).toHaveTextContent("Best");

    const stamps = screen.getAllByRole("button", { name: zssk.legs[0]!.agencyName });
    expect(stamps.length).toBeGreaterThan(0);
    await user.click(stamps[0]!);
    expect(onSelectedCarriersChange).toHaveBeenCalledWith([
      "Železničná spoločnosť Slovensko, a.s.",
    ]);
    expect(onJumpToItinerary).toHaveBeenCalledWith(1);
  });

  it("jumps from the ledger row", async () => {
    const user = userEvent.setup();
    const onSelectedCarriersChange = vi.fn();
    const onJumpToItinerary = vi.fn();
    const db = railItinerary();
    const zssk = railItinerary({
      startTime: "2026-08-14T16:00:00Z",
      duration: 18_000,
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

    const ledger = screen.getByTestId("carrier-ledger");
    const row = ledger.querySelector('[data-fastest="true"]');
    expect(row).toBeTruthy();
    await user.click(row as HTMLElement);
    expect(onJumpToItinerary).toHaveBeenCalledWith(0);
  });
});
