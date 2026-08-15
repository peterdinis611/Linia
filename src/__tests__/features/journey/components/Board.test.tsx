import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { berlin, prague } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { EmptyBoard, SearchingBoard, StationClock } from "@/features/journey/components/Board";

describe("StationClock", () => {
  it("prints the station clock kicker", () => {
    renderHall(<StationClock />);
    expect(screen.getByTestId("station-clock")).toHaveTextContent("Station clock");
  });
});

describe("SearchingBoard", () => {
  it("shows the live search copy", () => {
    renderHall(<SearchingBoard />);
    const board = screen.getByTestId("searching-board");
    expect(board).toHaveTextContent("Checking live connections");
    expect(board).toHaveAttribute("role", "status");
    expect(board).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByTestId("searching-vehicle")).toHaveLength(2);
  });
});

describe("EmptyBoard", () => {
  it("shows the idle copy and can start the hall walk", async () => {
    const user = userEvent.setup();
    const onTour = vi.fn();
    renderHall(
      <EmptyBoard
        hasSearched={false}
        kicker="The board is open"
        title="Name a station."
        body="Live European times."
        onTour={onTour}
      />,
    );

    expect(screen.getByTestId("empty-board")).toHaveTextContent("Name a station.");
    expect(screen.queryByText("No path")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Walk through the hall" }));
    expect(onTour).toHaveBeenCalledOnce();
  });

  it("stamps no path after a search and reprints a recent ticket", async () => {
    const user = userEvent.setup();
    const onRecentSelect = vi.fn();
    renderHall(
      <EmptyBoard
        hasSearched
        kicker="Nothing on this departure"
        title="No connections found"
        body="Try another hour."
        recents={[
          {
            from: berlin,
            to: prague,
            via: [],
            savedAt: 1,
          },
        ]}
        onRecentSelect={onRecentSelect}
      />,
    );

    expect(screen.getByText("No path")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-searches")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Walk through the hall" }),
    ).not.toBeInTheDocument();
  });

  it("lists recent tickets before the first search", async () => {
    const user = userEvent.setup();
    const onRecentSelect = vi.fn();
    const recent = { from: berlin, to: prague, via: [], savedAt: 1 };
    renderHall(
      <EmptyBoard
        hasSearched={false}
        kicker="The board is open"
        title="Name a station."
        body="Live European times."
        recents={[recent]}
        onRecentSelect={onRecentSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Berlin Hbf → Praha hl\.n\./ }));
    expect(onRecentSelect).toHaveBeenCalledWith(recent);
  });

  it("prints pinned home and work stamps on the idle board", async () => {
    const user = userEvent.setup();
    const onPinnedSelect = vi.fn();
    const home = {
      role: "home" as const,
      from: berlin,
      to: prague,
      via: [],
      savedAt: 1,
    };
    renderHall(
      <EmptyBoard
        hasSearched={false}
        kicker="The board is open"
        title="Name a station."
        body="Live European times."
        pins={[home]}
        onPinnedSelect={onPinnedSelect}
      />,
    );

    await user.click(screen.getByTestId("pinned-home"));
    expect(onPinnedSelect).toHaveBeenCalledWith(home);
  });
});
