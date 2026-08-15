import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HallLoader } from "@/components/status/HallLoader";
import { renderHall } from "@/test/render";

describe("HallLoader", () => {
  it("runs a train or bus across the compact map loader", async () => {
    renderHall(<HallLoader compact label="Loading map…" />);

    expect(screen.getByTestId("hall-loader")).toHaveClass("hall-loader-compact");
    expect(screen.getByText("Loading map…")).toBeInTheDocument();
    expect(await screen.findByTestId("searching-vehicle")).toHaveAttribute(
      "data-vehicle",
      expect.stringMatching(/^(train|bus)$/),
    );
  });
});
