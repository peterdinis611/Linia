import { expect, test } from "@playwright/test";
import {
  allowHallNotifications,
  openMapPocket,
  searchBerlinPrague,
  selectPlace,
} from "./helpers";

test.describe("desk stamps and share", () => {
  test("holds a second print and offers both as PDF", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("all-day").click();
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("2 connections")).toBeVisible();

    const tickets = page
      .getByTestId("journey-results")
      .getByRole("option");
    await expect(tickets).toHaveCount(2);

    await page.getByTestId("hold-print").click();
    await expect(page.getByTestId("hold-print")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await tickets.nth(1).click();
    await expect(page.getByTestId("desk-compare")).toBeVisible();
    await expect(page.getByTestId("print-selected-routes")).toHaveText(
      /Print both sheets \/ PDF/,
    );

    await page.getByTestId("share-open").click();
    await expect(page.getByTestId("share-print")).toHaveText(
      /Print 2 sheets \/ PDF/,
    );
    await expect(page.getByTestId("share-dialog")).toHaveText(
      /Each selected route prints on its own page/,
    );

    await expect(page.getByTestId("print-ticket")).toHaveCount(2);
  });

  test("toasts when the calendar stamp is saved", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();

    await page.getByTestId("share-open").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("share-calendar").click();
    await downloadPromise;

    await expect(page.locator("[data-sonner-toast]").first()).toContainText(
      "Calendar stamp saved",
    );
  });

  test("toasts when the public link is copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("share-open").click();

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toContainText(
      "Copied",
    );
  });

  test("shares a station board stub without a ticket", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await expect(page.getByTestId("station-board")).toBeVisible();

    await page.getByTestId("share-open").click();
    await expect(page.getByTestId("share-dialog")).toHaveAttribute(
      "data-kind",
      "board",
    );
    await expect(page.getByTestId("share-board-stub")).toContainText(
      "Berlin Hbf",
    );
    const shareUrl = await page.getByTestId("share-url").inputValue();
    expect(shareUrl).toMatch(/board=1/);
  });

  test("pins a usual line and reprints it from the empty board", async ({
    page,
  }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("pin-home")).toBeVisible();

    await page.getByTestId("pin-home").click();
    await expect(page.getByTestId("pin-home")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Clear ticket" }).click();
    await expect(page.getByTestId("pinned-searches")).toBeVisible();
    await page.getByTestId("pinned-home").click();

    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(
      "Berlin Hbf",
    );
    await expect(
      page.getByRole("combobox", { name: "Destination" }),
    ).toHaveValue("Praha hl.n.");
    await expect(page.getByTestId("journey-results")).toBeVisible();
  });

  test("toasts when trip watch is armed", async ({ page }) => {
    await allowHallNotifications(page);
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("watch-trip").click();

    await expect(page.getByTestId("watch-trip")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("[data-sonner-toast]").first()).toContainText(
      "Watching until morning",
    );
  });
});

test.describe("hall keys and sound", () => {
  test("swaps ends with the R shortcut", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");

    await page.getByRole("heading", { name: "Linia" }).click();
    await page.keyboard.press("r");
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(
      "Praha hl.n.",
    );
    await expect(
      page.getByRole("combobox", { name: "Destination" }),
    ).toHaveValue("Berlin Hbf");
  });

  test("opens the keyboard shortcuts notice", async ({ page }) => {
    await page.goto("/");
    const keys = page.locator("details.hall-keys");
    await page.getByTestId("keyboard-shortcuts").click();
    await expect(keys).toHaveAttribute("open", "");
    await expect(keys).toContainText("/ — focus search");
  });

  test("toggles board sound", async ({ page }) => {
    await page.goto("/");
    const sound = page.getByTestId("board-sound");
    await expect(sound).toBeVisible();
    const before = await sound.getAttribute("aria-pressed");
    await sound.click();
    await expect(sound).not.toHaveAttribute("aria-pressed", before ?? "");
  });
});

test.describe("filters and map rails", () => {
  test("stamps rail only and still finds the mock", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Rail" }).click();
    await expect(page.getByRole("button", { name: "Rail" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await searchBerlinPrague(page);
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("stamps direct only on the mock board", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page
      .getByRole("group", { name: "Direct or transfers" })
      .getByRole("button", { name: /Direct/ })
      .click();
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("shows carrier desk after a return search", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("return-trip").click();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();
    await page.getByTestId("hall-leg-outbound").click();

    await expect(page.getByTestId("carrier-desk")).toBeVisible();
    await expect(
      page.getByTestId("carrier-desk").getByRole("button", { name: "Deutsche Bahn" }),
    ).toBeVisible();
  });

  test("draws map track rails for the day's board", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("all-day").click();
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();

    // Desktop keeps the wall map open; phone uses the pocket stamp.
    const pocket = page.getByTestId("map-pocket");
    if (await pocket.isVisible()) {
      await openMapPocket(page);
    }
    await expect(page.locator(".maplibregl-map").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("map-track-rails")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".map-track-rail")).toHaveCount(2);
  });

  test("folds the map pocket with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const pocket = page.getByTestId("map-pocket");
    await pocket.click();
    await expect(pocket).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(pocket).toHaveAttribute("aria-expanded", "false");
  });
});
