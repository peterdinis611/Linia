import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { berlin, prague } from "@/test/fixtures";
import { renderHall } from "@/test/render";
import { PinLine } from "@/features/journey/components/PinLine";

describe("PinLine", () => {
  it("stamps home, work or this line onto the ticket", async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    renderHall(
      <PinLine
        from={berlin}
        to={prague}
        via={[]}
        pins={[]}
        onPin={onPin}
        onUnpin={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pin-home"));
    expect(onPin).toHaveBeenCalledWith("home");
    await user.click(screen.getByTestId("pin-work"));
    expect(onPin).toHaveBeenCalledWith("work");
  });

  it("unpins the line that already sits on this ticket", async () => {
    const user = userEvent.setup();
    const onUnpin = vi.fn();
    renderHall(
      <PinLine
        from={berlin}
        to={prague}
        via={[]}
        pins={[
          {
            role: "home",
            from: berlin,
            to: prague,
            via: [],
            savedAt: 1,
          },
        ]}
        onPin={vi.fn()}
        onUnpin={onUnpin}
      />,
    );
    expect(screen.getByTestId("pin-home")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("unpin-line"));
    expect(onUnpin).toHaveBeenCalledWith("home");
  });
});
