import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a stamp and fires the click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Find connections</Button>);

    const button = screen.getByRole("button", { name: "Find connections" });
    expect(button).toHaveAttribute("data-slot", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("can be disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Searching…
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Searching…" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
