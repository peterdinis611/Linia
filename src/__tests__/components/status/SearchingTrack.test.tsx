import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchingTrack } from "@/components/status/SearchingTrack";
import { renderHall } from "@/test/render";

describe("SearchingTrack", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stamps a train when the hall picks the rail mark", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    renderHall(<SearchingTrack />);

    expect(await screen.findByTestId("searching-vehicle")).toHaveAttribute(
      "data-vehicle",
      "train",
    );
  });

  it("stamps a bus when the hall picks the coach mark", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    renderHall(<SearchingTrack />);

    expect(await screen.findByTestId("searching-vehicle")).toHaveAttribute(
      "data-vehicle",
      "bus",
    );
  });

  it("flips the mark after a lap", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    renderHall(<SearchingTrack />);
    const vehicle = await screen.findByTestId("searching-vehicle");

    act(() => {
      vehicle.dispatchEvent(new Event("animationiteration"));
    });

    await waitFor(() => {
      expect(vehicle).toHaveAttribute("data-vehicle", "bus");
    });

    act(() => {
      vehicle.dispatchEvent(new Event("animationiteration"));
    });

    await waitFor(() => {
      expect(vehicle).toHaveAttribute("data-vehicle", "train");
    });
  });
});
