import { expect, test } from "@playwright/test";
import { searchBerlinPrague, setHallClock } from "./helpers";

test.describe("hall clock and calendar", () => {
  test("lets you set a departure time without unstamping leave now first", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await setHallClock(page, "21", "45");

    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("keeps the clock open after picking an hour", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("journey-time").click();
    await expect(page.getByTestId("hall-clock")).toBeVisible();
    await page.getByTestId("hall-clock-hour-18").click();

    await expect(page.getByTestId("hall-clock")).toBeVisible();
    await expect(page.getByTestId("journey-time").locator(".hall-when-time-value")).toHaveText(
      /^18:/,
    );
  });

  test("picks today from the paper calendar and unstamps leave now", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("journey-date").click();
    await expect(page.getByTestId("hall-cal")).toBeVisible();

    await page.getByTestId("hall-cal-today").click();

    await expect(page.getByTestId("hall-cal")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("journey-date").locator(".hall-when-day")).toHaveText(
      String(new Date().getDate()),
    );
  });

  test("picks another day in the open month", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("journey-date").click();
    await expect(page.getByTestId("hall-cal")).toBeVisible();

    const other = page.locator('.hall-cal-day[data-muted="false"]:not([data-on="true"])').first();
    const day = ((await other.textContent()) ?? "").trim();
    await other.click();

    await expect(page.getByTestId("hall-cal")).toHaveCount(0);
    await expect(page.getByTestId("journey-date").locator(".hall-when-day")).toHaveText(day);
  });

  test("turns the calendar to the next month", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("journey-date").click();
    await expect(page.getByTestId("hall-cal")).toBeVisible();

    const title = page.locator(".hall-cal-title");
    const before = (await title.textContent()) ?? "";
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(title).not.toHaveText(before);
  });

  test("arrive by flips the clock kicker and clears leave now", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Arrive by" }).click();

    await expect(page.getByRole("button", { name: "Arrive by" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.locator("[data-tour='when'] p.kicker")).toHaveText("Arrival");
  });

  test("lets you stamp leave now again after picking a time", async ({ page }) => {
    await page.goto("/");
    await setHallClock(page, "06", "10");
    await page.getByRole("button", { name: "Leave now" }).click();

    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("stamps that day, hides the clock, and prints the day's board", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("all-day").click();

    await expect(page.getByTestId("all-day")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Leave now" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByRole("button", { name: "Arrive by" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("journey-time")).toHaveCount(0);
    await expect(page.locator("[data-tour='when'] p.kicker")).toHaveText(
      "The day's board",
    );

    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("2 connections")).toBeVisible();
    await expect(page.getByTestId("earlier-connections")).toHaveCount(0);
    await expect(page.getByTestId("later-connections")).toHaveCount(0);
  });

  test("unstamps that day and brings the clock back", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("all-day").click();
    await expect(page.getByTestId("journey-time")).toHaveCount(0);

    await page.getByTestId("all-day").click();

    await expect(page.getByTestId("all-day")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("journey-time")).toBeVisible();
  });

  test("keeps that day stamped when you pick another date", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("all-day").click();
    await page.getByTestId("journey-date").click();
    await expect(page.getByTestId("hall-cal")).toBeVisible();

    const other = page.locator('.hall-cal-day[data-muted="false"]:not([data-on="true"])').first();
    await other.click();

    await expect(page.getByTestId("all-day")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("journey-time")).toHaveCount(0);
  });
});
