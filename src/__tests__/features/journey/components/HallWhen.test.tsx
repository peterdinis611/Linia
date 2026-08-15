import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { HallWhen } from "@/features/journey/components/HallWhen";

describe("HallWhen", () => {
  it("opens the paper calendar and commits a day", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderHall(
      <HallWhen datetime="2026-08-14T08:30" leaveNow={false} onChange={onChange} />,
    );

    await user.click(screen.getByTestId("journey-date"));
    expect(screen.getByTestId("hall-cal")).toBeInTheDocument();
    await user.click(screen.getByTestId("hall-cal-day-2026-08-20"));
    expect(onChange).toHaveBeenCalledWith("2026-08-20T08:30");
  });

  it("prefixes the return stamp fields", () => {
    renderHall(
      <HallWhen
        datetime="2026-08-15T08:30"
        leaveNow={false}
        idPrefix="return"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("return-date")).toBeInTheDocument();
    expect(screen.getByTestId("return-time")).toBeInTheDocument();
    expect(screen.queryByTestId("journey-date")).not.toBeInTheDocument();
  });

  it("hides the clock when the whole day is stamped", () => {
    renderHall(
      <HallWhen
        datetime="2026-08-14T00:00"
        leaveNow={false}
        allDay
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journey-date")).toBeInTheDocument();
    expect(screen.queryByTestId("journey-time")).not.toBeInTheDocument();
    expect(screen.getByTestId("journey-date").closest(".hall-when")).toHaveAttribute(
      "data-day",
      "true",
    );
  });

  it("keeps the clock open after an hour, then commits the minute", async () => {
    const user = userEvent.setup();
    function Clock() {
      const [value, setValue] = useState("2026-08-14T08:30");
      return <HallWhen datetime={value} leaveNow={false} onChange={setValue} />;
    }
    renderHall(<Clock />);

    await user.click(screen.getByTestId("journey-time"));
    expect(screen.getByTestId("hall-clock")).toBeInTheDocument();
    await user.click(screen.getByTestId("hall-clock-hour-21"));
    expect(screen.getByTestId("hall-clock")).toBeInTheDocument();
    expect(screen.getByTestId("journey-time")).toHaveTextContent("21:30");
    await user.click(screen.getByTestId("hall-clock-minute-45"));
    expect(screen.getByTestId("journey-time")).toHaveTextContent("21:45");
  });
});
