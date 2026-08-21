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
    city: null,
    distanceFilter: "all",
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
    onCityChange: vi.fn(),
    onDistanceFilterChange: vi.fn(),
    onModeFilterChange: vi.fn(),
    onTransferFilterChange: vi.fn(),
    onAccessibleChange: vi.fn(),
    onBikeChange: vi.fn(),
    onNightChange: vi.fn(),
    onWantReturnChange: vi.fn(),
    onReturnDatetimeChange: vi.fn(),
    onSearch: vi.fn(),
    onClear: vi.fn(),
    accessible: false,
    bike: false,
    night: false,
    wantReturn: false,
    returnDatetime: "2026-08-15T08:30",
    ...overrides,
  };
  return { ...renderHall(<SearchForm {...props} />), props };
}

describe("SearchForm", () => {
  it("asks for a city before suburban lines", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByTestId("distance-suburban"));
    expect(props.onDistanceFilterChange).toHaveBeenCalledWith("suburban");
    expect(screen.getByRole("combobox", { name: "City" })).toBeInTheDocument();
    expect(screen.getByText("Name the city first. Then stamp long-distance or suburban.")).toBeInTheDocument();
  });

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

  it("stamps the station board", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByTestId("station-board-mode"));
    expect(props.onRouteModeChange).toHaveBeenCalledWith("board");
  });

  it("stamps accessible, bike, night and return", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();
    await user.click(screen.getByTestId("accessible"));
    expect(props.onAccessibleChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByTestId("bike"));
    expect(props.onBikeChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByTestId("night-rail"));
    expect(props.onNightChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByTestId("return-trip"));
    expect(props.onWantReturnChange).toHaveBeenCalledWith(true);
  });

  it("pins suburban from and to on the same ticket", () => {
    renderForm({ distanceFilter: "suburban" });
    expect(screen.getByRole("combobox", { name: "Destination" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Swap origin and destination" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Via stops" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Stamp from and to. The map pins both stops and the suburban line.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find connections" })).toBeInTheDocument();
  });

  it("hides the journey desk on the station board", () => {
    renderForm({ routeMode: "board" });
    expect(screen.queryByRole("combobox", { name: "Destination" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Swap origin and destination" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("return-trip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("accessible")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bike")).not.toBeInTheDocument();
    expect(screen.queryByTestId("night-rail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read the board" })).toBeInTheDocument();
    expect(screen.getByTestId("station-board-mode")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("prints a return date when the stamp is on", () => {
    renderForm({ wantReturn: true });
    expect(screen.getByText("Return stamp")).toBeInTheDocument();
    expect(screen.getByTestId("return-date")).toBeInTheDocument();
    expect(screen.getByTestId("return-time")).toBeInTheDocument();
    expect(screen.getByTestId("return-trip")).toHaveAttribute("aria-pressed", "true");
  });

  it("prints a return time fault", () => {
    renderForm({
      wantReturn: true,
      fieldErrors: { returnTime: "validation.returnTimeRequired" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a return time");
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

  it("stamps a nearby board from this stop", async () => {
    const user = userEvent.setup();
    const onNearbyBoard = vi.fn();
    renderForm({ onUseMyLocation: vi.fn(), onNearbyBoard });
    await user.click(screen.getByTestId("nearby-board"));
    expect(onNearbyBoard).toHaveBeenCalledOnce();
  });
});
