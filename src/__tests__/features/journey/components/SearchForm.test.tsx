import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { SearchForm } from "@/features/journey/components/SearchForm";

type Props = Parameters<typeof SearchForm>[0];

function renderForm(overrides: Partial<Props> = {}) {
  const props: Props = {
    from: null,
    to: null,
    via: [],
    routeMode: "point",
    leaveNow: true,
    datetime: "2026-08-14T08:30",
    arriveBy: false,
    allDay: false,
    modeFilter: "all",
    transferFilter: "all",
    loading: false,
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
    onViaChange: vi.fn(),
    onAddVia: vi.fn(),
    onRemoveVia: vi.fn(),
    onRouteModeChange: vi.fn(),
    onSwap: vi.fn(),
    onLeaveNowChange: vi.fn(),
    onDatetimeChange: vi.fn(),
    onArriveByChange: vi.fn(),
    onAllDayChange: vi.fn(),
    onModeFilterChange: vi.fn(),
    onTransferFilterChange: vi.fn(),
    onSearch: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  return { ...renderHall(<SearchForm {...props} />), props };
}

describe("SearchForm", () => {
  it("stamps leave now by default", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Departure")).toBeInTheDocument();
  });

  it("stamps that day and prints the day's board", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByTestId("all-day"));
    expect(props.onAllDayChange).toHaveBeenCalledWith(true);
  });

  it("shows the day's board kicker and hides the clock", () => {
    renderForm({ allDay: true, leaveNow: false });
    expect(screen.getByText("The day's board")).toBeInTheDocument();
    expect(screen.getByTestId("all-day")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("journey-time")).not.toBeInTheDocument();
  });

  it("flips the kicker when arrive by is stamped", () => {
    renderForm({ arriveBy: true, leaveNow: false });
    expect(screen.getByText("Arrival")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arrive by" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches to via stops", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByRole("button", { name: "Via stops" }));
    expect(props.onRouteModeChange).toHaveBeenCalledWith("via");
  });

  it("asks to find connections", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByRole("button", { name: "Find connections" }));
    expect(props.onSearch).toHaveBeenCalledOnce();
  });

  it("keeps the hall stamp busy while searching", () => {
    renderForm({ loading: true });
    const find = screen.getByRole("button", { name: "Searching…" });
    expect(find).toHaveAttribute("data-busy", "true");
    expect(find).toHaveAttribute("aria-busy", "true");
    expect(find.querySelector(".search-cta-spin")).toBeTruthy();
  });
});
