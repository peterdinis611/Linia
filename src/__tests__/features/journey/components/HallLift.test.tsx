import { useRef } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { HallLift } from "@/features/journey/components/HallLift";

function LiftFixture() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div
        ref={ref}
        data-testid="scroller"
        style={{ height: 80, overflow: "auto" }}
      >
        <div style={{ height: 800 }}>tall board</div>
      </div>
      <HallLift targetRef={ref} />
    </div>
  );
}

describe("HallLift", () => {
  it("stays off the desk until the board is scrolled", () => {
    renderHall(<LiftFixture />);
    expect(screen.getByTestId("hall-lift")).toHaveAttribute("data-on", "false");
  });

  it("prints a lift stamp and returns to the desk", async () => {
    const user = userEvent.setup();
    renderHall(<LiftFixture />);
    const scroller = screen.getByTestId("scroller");
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo;
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: () => 400,
    });
    fireEvent.scroll(scroller);

    const lift = screen.getByTestId("hall-lift");
    await waitFor(() => expect(lift).toHaveAttribute("data-on", "true"));
    expect(lift).toHaveTextContent("To the desk");

    await user.click(lift);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
