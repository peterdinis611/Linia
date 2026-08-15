import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HallLoader } from "@/components/status/HallLoader";
import { renderHall } from "@/test/render";

describe("HallLoader", () => {
  it("runs a car and a train across the compact map loader", () => {
    renderHall(<HallLoader compact label="Loading map…" />);

    expect(screen.getByTestId("hall-loader")).toHaveClass("hall-loader-compact");
    expect(screen.getByText("Loading map…")).toBeInTheDocument();
    expect(screen.getAllByTestId("searching-vehicle").map((node) => node.getAttribute("data-vehicle"))).toEqual(
      ["car", "train"],
    );
  });

  it("runs a car and a train across the preload loader", () => {
    renderHall(<HallLoader label="Live board" />);
    expect(screen.getByTestId("searching-track")).toBeInTheDocument();
    expect(screen.getAllByTestId("searching-vehicle")).toHaveLength(2);
  });
});
