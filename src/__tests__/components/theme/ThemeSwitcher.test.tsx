import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderHall } from "@/test/render";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

describe("ThemeSwitcher", () => {
  it("stamps light by default and can switch to dark", async () => {
    const user = userEvent.setup();
    renderHall(<ThemeSwitcher />);

    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(document.documentElement).toHaveClass("dark");
  });
});
