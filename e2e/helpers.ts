import { expect, type Page } from "@playwright/test";
import type { Locale } from "../src/i18n/config";

export async function selectPlace(
  page: Page,
  label: "Origin" | "Destination" | "Via 1" | "Via 2",
  query: string,
  optionName: string,
) {
  const field = page.getByRole("combobox", { name: label });
  await field.fill(query);
  await expect(page.getByRole("option", { name: new RegExp(optionName) })).toBeVisible();
  await page.getByRole("option", { name: new RegExp(optionName) }).click();
  await expect(field).toHaveValue(optionName);
}

export async function searchBerlinPrague(page: Page) {
  await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
  await selectPlace(page, "Destination", "Prague", "Praha hl.n.");
}

export async function selectLocale(
  page: Page,
  locale: Locale,
) {
  await page.getByTestId("language-switcher").click();
  await page.getByTestId(`lang-option-${locale}`).click();
}

export async function clickMap(page: Page, x = 0.45, y = 0.45) {
  const map = page.locator(".maplibregl-map").first();
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box!.x + box!.width * x, box!.y + box!.height * y);
}

/** @deprecated use clickMap */
export const clickLeaflet = clickMap;

export async function setHallClock(page: Page, hour: string, minute: string) {
  await page.getByTestId("journey-time").click();
  await expect(page.getByTestId("hall-clock")).toBeVisible();
  await page.getByTestId(`hall-clock-hour-${hour}`).click();
  await page.getByTestId(`hall-clock-minute-${minute}`).click();
  await expect(page.getByTestId("journey-time")).toContainText(`${hour}:${minute}`);
}

export async function openMapPocket(page: Page) {
  const pocket = page.getByTestId("map-pocket");
  await expect(pocket).toBeVisible();
  if ((await pocket.getAttribute("aria-expanded")) === "false") {
    await pocket.click();
  }
  await expect(pocket).toHaveAttribute("aria-expanded", "true");
}

/** Headless Chromium often denies Notification.requestPermission — stub grant. */
export async function allowHallNotifications(page: Page) {
  await page.addInitScript(() => {
    class HallNotification {
      static permission: NotificationPermission = "granted";
      static async requestPermission() {
        HallNotification.permission = "granted";
        return "granted" as NotificationPermission;
      }
      constructor(
        public title: string,
        public options?: NotificationOptions,
      ) {}
    }
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: HallNotification,
    });
  });
}
