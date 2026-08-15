import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchingTrack } from "@/components/status/SearchingTrack";
import { renderHall } from "@/test/render";

describe("SearchingTrack", () => {
  it("prints a car on the road and a train on the railway", () => {
    renderHall(<SearchingTrack />);
    const vehicles = screen.getAllByTestId("searching-vehicle");

    expect(vehicles).toHaveLength(2);
    expect(vehicles[0]).toHaveAttribute("data-vehicle", "car");
    expect(vehicles[1]).toHaveAttribute("data-vehicle", "train");
  });
});
