import { expect, test } from "@playwright/test";
import { searchBerlinPrague, selectLocale, selectPlace } from "./helpers";

test.describe("hall stamps", () => {
  test("hides the journey desk on the station board", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();

    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Swap origin and destination" })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("return-trip")).toHaveCount(0);
    await expect(page.getByTestId("accessible")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Read the board" })).toBeVisible();
  });

  test("prints arrivals when arrive by is stamped", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();
    await page.getByRole("button", { name: "Arrive by" }).click();
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");

    const board = page.getByTestId("station-board");
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute("aria-label", "What arrives here");
    await expect(page.getByTestId("station-row-0")).toContainText("to Berlin Hbf");
  });

  test("writes a public board link without a destination", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await expect(page.getByTestId("station-board")).toBeVisible();
    await expect(page).toHaveURL(/board=1/);
    await expect(page).toHaveURL(/from=/);
    expect(page.url()).not.toMatch(/[?&]to=/);
  });

  test("opens a station board from a stop on the strip", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();

    await page.getByRole("button", { name: "Berlin Hbf. Station board" }).click();
    await expect(page.getByTestId("station-board-mode")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("station-board")).toBeVisible();
  });

  test("stamps accessible onto the public ticket", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await page.getByTestId("accessible").click();
    await expect(page.getByTestId("accessible")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/access=1/);

    await page.getByTestId("share-open").click();
    const shareUrl = await page.getByTestId("share-url").inputValue();
    expect(shareUrl).toContain("access=1");
  });

  test("keeps the outbound ticket when the return tab is open", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("return-trip").click();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();
    await expect(page).toHaveURL(/back=/);

    await page.getByTestId("hall-leg-inbound").click();
    await expect(page.getByText("EC 173").first()).toBeVisible();
    await page.getByTestId("hall-leg-outbound").click();
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("clears the return tab when the stamp is lifted", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("return-trip").click();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();

    await page.getByTestId("return-trip").click();
    await expect(page.getByTestId("return-trip")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("hall-leg-inbound")).toHaveCount(0);
    await expect(page.getByTestId("journey-results").getByText("EC 172").first()).toBeVisible();
  });

  test("prints Slovak stamps for the new hall", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "sk");
    await expect(page.getByRole("button", { name: "Tabuľa stanice" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bezbariérové" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spiatočný" })).toBeVisible();
  });

  test("reopens a public station board from the address", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await expect(page.getByTestId("station-board")).toBeVisible();
    const boardUrl = page.url();
    expect(boardUrl).toMatch(/board=1/);

    await page.goto(boardUrl);
    await expect(page.getByTestId("station-board-mode")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Berlin Hbf");
    await expect(page.getByTestId("station-board")).toBeVisible();
  });

  test("shares the return stamp on the public ticket", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("return-trip").click();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();

    await page.getByTestId("share-open").click();
    const shareUrl = await page.getByTestId("share-url").inputValue();
    expect(shareUrl).toContain("back=");
    expect(shareUrl).toContain("rtrip=");

    await page.goto(shareUrl);
    await expect(page.getByTestId("return-trip")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("hall-leg-outbound")).toBeVisible();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();
  });

  test("opens a service notice on the strip", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("alert-ribbon")).toBeVisible();
    const notice = page.getByTestId("alert-notice").first();
    await expect(notice).toBeVisible();
    await notice.locator("summary").click();
    await expect(notice).toContainText("Rail replacement between Dresden and Praha.");
  });
});
