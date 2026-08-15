import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHall } from "@/test/render";
import { LanguageSwitcher } from "@/i18n/language-switcher";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ push }),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("opens the paper country picker", async () => {
    const user = userEvent.setup();
    renderHall(<LanguageSwitcher />);

    expect(screen.getByTestId("language-switcher")).toHaveAttribute("data-locale", "en");
    await user.click(screen.getByTestId("language-switcher"));
    expect(screen.getByTestId("lang-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("lang-option-sk")).toHaveTextContent("Slovenčina");
    expect(screen.getByTestId("lang-option-it")).toHaveTextContent("Italiano");
    expect(screen.getByTestId("lang-option-uk")).toHaveTextContent("Українська");
    expect(screen.getByTestId("lang-option-en")).toHaveAttribute("aria-selected", "true");
  });

  it("pushes the chosen locale", async () => {
    const user = userEvent.setup();
    renderHall(<LanguageSwitcher search="?from=1" />);

    await user.click(screen.getByTestId("language-switcher"));
    await user.click(screen.getByTestId("lang-option-sk"));
    expect(push).toHaveBeenCalledWith("/sk?from=1");
  });
});
