import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusScreen } from "@/components/status/StatusScreen";

describe("StatusScreen", () => {
  it("prints the hall brand and the notice", () => {
    render(
      <StatusScreen
        mark="404"
        kicker="Empty platform"
        title="This platform is empty"
        body="The line does not stop here."
      />,
    );

    expect(screen.getByText("Linia")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This platform is empty" })).toBeInTheDocument();
    expect(screen.getByText("The line does not stop here.")).toBeInTheDocument();
  });

  it("shows the car and train when the board is busy", () => {
    render(
      <StatusScreen
        kicker="Hold the line"
        title="Checking the board"
        body="One moment."
        busy
        busyLabel="Live board"
      />,
    );

    expect(screen.getByTestId("hall-loader")).toBeInTheDocument();
    expect(screen.getByText("Live board")).toBeInTheDocument();
    expect(screen.getAllByTestId("searching-vehicle")).toHaveLength(2);
  });
});
