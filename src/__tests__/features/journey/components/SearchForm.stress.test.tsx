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
        city={null}
        distanceFilter="all"
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
        onCityChange={vi.fn()}
        onDistanceFilterChange={vi.fn()}
        onWantReturnChange={vi.fn()}
        onReturnDatetimeChange={vi.fn()}
        onSearch={onSearch}
        onClear={vi.fn()}
        wantReturn={false}
        returnDatetime="2026-08-15T08:30"
      />,
    );

    const leaveNow = screen.getByRole("button", { name: "Leave now" });
    const arriveBy = screen.getByRole("button", { name: "Arrive by" });
    const allDay = screen.getByTestId("all-day");
    const find = screen.getByRole("button", { name: "Find connections" });

    for (let index = 0; index < 12; index += 1) {
      await user.click(allDay);
      await user.click(arriveBy);
      await user.click(leaveNow);
      await user.click(find);
    }

    expect(onAllDayChange).toHaveBeenCalled();
    expect(onArriveByChange).toHaveBeenCalled();
    expect(onLeaveNowChange).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledTimes(12);
    expect(onRouteModeChange).not.toHaveBeenCalled();
  });
});
