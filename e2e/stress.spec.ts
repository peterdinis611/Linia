import { expect, test } from "@playwright/test";
import { searchBerlinPrague } from "./helpers";

test.describe("hall stress", () => {
  test("keeps the board after a burst of stamps and reprints", async ({
    page,
  }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();

    const leaveNow = page.getByRole("button", { name: "Leave now" });
    const arriveBy = page.getByRole("button", { name: "Arrive by" });
    const allDay = page.getByTestId("all-day");
    const rail = page.getByRole("button", { name: "Rail" });
    const allModes = page.getByRole("button", { name: "All" }).first();
    const find = page.getByRole("button", { name: "Find connections" });

    for (let index = 0; index < 8; index += 1) {
      await allDay.click();
      await arriveBy.click();
      await leaveNow.click();
      await rail.click();
      await allModes.click();
      await find.click();
    }

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("EC 172").first()).toBeVisible();

    for (let index = 0; index < 6; index += 1) {
      await page.getByTestId("later-connections").click();
      await expect(page.getByText("EC 172").first()).toBeVisible();
      await page.getByTestId("sort-fastest").click();
      await page.getByTestId("sort-depart").click();
      await page.getByTestId("refresh-live").click();
    }

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The line, stop by stop" })).toBeVisible();
  });

  test("opens the country picker under a burst of taps", async ({ page }) => {
    await page.goto("/");

    for (let index = 0; index < 10; index += 1) {
      await page.getByTestId("language-switcher").click();
      await expect(page.getByTestId("lang-sheet")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("lang-sheet")).toHaveCount(0);
    }

    await expect(page.getByTestId("language-switcher")).toHaveAttribute(
      "data-locale",
      "en",
    );
  });
});
