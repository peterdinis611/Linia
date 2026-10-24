import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickRoutes } from "@/features/journey/components/QuickRoutes";
import { berlin, prague } from "@/test/fixtures";
import { renderHall } from "@/test/render";

describe("QuickRoutes", () => {
  it("prints pinned and recent stamps", async () => {
    const user = userEvent.setup();
    const onPinnedSelect = vi.fn();
    const onRecentSelect = vi.fn();
    const home = {
      role: "home" as const,
      from: berlin,
      to: prague,
      via: [],
      savedAt: 1,
    };
    const recent = {
      from: berlin,
      to: prague,
      via: [],
      savedAt: 2,
    };
    renderHall(
      <QuickRoutes
        pins={[home]}
        recents={[recent]}
        onPinnedSelect={onPinnedSelect}
        onRecentSelect={onRecentSelect}
      />,
    );

    await user.click(screen.getByTestId("pinned-home"));
    expect(onPinnedSelect).toHaveBeenCalledWith(home);
    await user.click(screen.getByTestId("recent-searches").querySelector("button")!);
    expect(onRecentSelect).toHaveBeenCalledWith(recent);
  });
});
