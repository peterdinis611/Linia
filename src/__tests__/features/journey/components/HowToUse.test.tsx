import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { HowToButton, HowToGuide } from "@/features/journey/components/HowToUse";

describe("HowToGuide", () => {
  it("prints the four hall steps", () => {
    renderHall(<HowToGuide />);
    expect(screen.getByText("Name origin and destination")).toBeInTheDocument();
    expect(screen.getByText("Add a stop if you need one")).toBeInTheDocument();
    expect(screen.getByText("Set when you travel")).toBeInTheDocument();
    expect(screen.getByText("Find connections and read the line")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Walk through the hall" })).not.toBeInTheDocument();
  });

  it("can start the walk", async () => {
    const user = userEvent.setup();
    const onTour = vi.fn();
    renderHall(<HowToGuide onTour={onTour} />);
    await user.click(screen.getByRole("button", { name: "Walk through the hall" }));
    expect(onTour).toHaveBeenCalledOnce();
  });
});

describe("HowToButton", () => {
  it("opens the hall guide", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderHall(<HowToButton onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "How to use Linia" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
