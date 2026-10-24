import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { EmptyBoard, SearchingBoard, StationClock } from "@/features/journey/components/Board";

describe("StationClock", () => {
  it("prints the station clock kicker", () => {
    renderHall(<StationClock />);
    const clock = screen.getByTestId("station-clock");
    expect(clock).toHaveTextContent("Station clock");
    expect(clock).toHaveClass("board-clock");
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
  it("shows the idle copy and can start the hall walk when guide is on", async () => {
    const user = userEvent.setup();
    const onTour = vi.fn();
    renderHall(
      <EmptyBoard
        hasSearched={false}
        kicker="The board is open"
        title="Name a station."
        body="Live European times."
        showGuide
        onTour={onTour}
      />,
    );

    expect(screen.getByTestId("empty-board")).toHaveTextContent("Name a station.");
    expect(screen.queryByText("No path")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Walk through the hall" }));
    expect(onTour).toHaveBeenCalledOnce();
  });

  it("hides the howto when the guide is off", () => {
    renderHall(
      <EmptyBoard
        hasSearched={false}
        kicker="The board is open"
        title="Name a station."
        body="Live European times."
        showGuide={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Walk through the hall" }),
    ).not.toBeInTheDocument();
  });

  it("stamps no path after a search without inline recents", () => {
    renderHall(
      <EmptyBoard
        hasSearched
        kicker="Nothing on this departure"
        title="No connections found"
        body="Try another hour."
      />,
    );

    expect(screen.getByText("No path")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-searches")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Walk through the hall" }),
    ).not.toBeInTheDocument();
  });

  it("explains a timetable gap after a search", () => {
    renderHall(
      <EmptyBoard
        hasSearched
        kicker="Nothing on this departure"
        title="No connections found"
        body="Try another hour."
        serviceFrom="2026-12-01T18:40:00Z"
      />,
    );

    const gap = screen.getByTestId("service-gap");
    expect(gap).toHaveTextContent("Timetable gap");
    expect(gap).toHaveTextContent("Next connection in");
    expect(gap).toHaveTextContent("Service from");
  });

  it("prints last today and tomorrow from on an empty board", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(4, 12, 0, 0);
    const last = new Date();
    last.setHours(23, 40, 0, 0);

    renderHall(
      <EmptyBoard
        hasSearched
        kicker="Nothing on this departure"
        title="No connections found"
        body="Try another hour."
        lastAt={last.toISOString()}
        serviceFrom={tomorrow.toISOString()}
      />,
    );

    expect(screen.getByTestId("last-today")).toHaveTextContent("Last today at");
    expect(screen.getByTestId("service-gap")).toHaveTextContent("Tomorrow from");
  });
});
