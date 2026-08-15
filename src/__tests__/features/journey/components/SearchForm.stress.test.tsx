import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { SearchForm } from "@/features/journey/components/SearchForm";

describe("SearchForm stress", () => {
  it("survives a burst of hall stamps", async () => {
    const user = userEvent.setup();
    const onLeaveNowChange = vi.fn();
    const onArriveByChange = vi.fn();
    const onAllDayChange = vi.fn();
    const onModeFilterChange = vi.fn();
    const onTransferFilterChange = vi.fn();
    const onSearch = vi.fn();
    const onRouteModeChange = vi.fn();

    renderHall(
      <SearchForm
        from={null}
        to={null}
        via={[]}
        routeMode="point"
        leaveNow
        datetime="2026-08-14T08:30"
        arriveBy={false}
        allDay={false}
        modeFilter="all"
        transferFilter="all"
        loading={false}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onViaChange={vi.fn()}
        onAddVia={vi.fn()}
        onRemoveVia={vi.fn()}
        onRouteModeChange={onRouteModeChange}
        onSwap={vi.fn()}
        onLeaveNowChange={onLeaveNowChange}
        onDatetimeChange={vi.fn()}
        onArriveByChange={onArriveByChange}
        onAllDayChange={onAllDayChange}
        onModeFilterChange={onModeFilterChange}
        onTransferFilterChange={onTransferFilterChange}
        onAccessibleChange={vi.fn()}
        onBikeChange={vi.fn()}
        onNightChange={vi.fn()}
        onWantReturnChange={vi.fn()}
        onReturnDatetimeChange={vi.fn()}
        onSearch={onSearch}
        onClear={vi.fn()}
        accessible={false}
        bike={false}
        night={false}
        wantReturn={false}
        returnDatetime="2026-08-15T08:30"
      />,
    );

    const leaveNow = screen.getByRole("button", { name: "Leave now" });
    const arriveBy = screen.getByRole("button", { name: "Arrive by" });
    const allDay = screen.getByTestId("all-day");
    const rail = screen.getByRole("button", { name: "Rail" });
    const coach = screen.getByRole("button", { name: "Coach" });
    const direct = screen.getByRole("button", { name: "Direct" });
    const find = screen.getByRole("button", { name: "Find connections" });

    for (let index = 0; index < 12; index += 1) {
      await user.click(allDay);
      await user.click(arriveBy);
      await user.click(leaveNow);
      await user.click(rail);
      await user.click(coach);
      await user.click(direct);
      await user.click(find);
    }

    await user.click(screen.getByRole("button", { name: "Via stops" }));

    expect(onAllDayChange).toHaveBeenCalledTimes(12);
    expect(onArriveByChange).toHaveBeenCalledTimes(12);
    expect(onLeaveNowChange).toHaveBeenCalledTimes(12);
    expect(onSearch).toHaveBeenCalledTimes(12);
    expect(onRouteModeChange).toHaveBeenCalledWith("via");
    expect(onModeFilterChange).toHaveBeenCalled();
    expect(onTransferFilterChange).toHaveBeenCalled();
  });
});
