import { expect, test } from "@playwright/test";
import {
  clickLeaflet,
  searchBerlinPrague,
  selectLocale,
  selectPlace,
} from "./helpers";

test.describe("home", () => {
  test("shows the search board", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Linia" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Journey search" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Origin" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Destination" })).toBeVisible();
    await expect(page.getByTestId("use-location")).toBeVisible();
    await expect(page.getByTestId("nearby-board")).toBeVisible();
    await expect(page.getByRole("button", { name: "Swap origin and destination" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Point to point" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Via stops" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Station board" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pin origin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pin destination" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pin via" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add via" })).toHaveCount(0);
    await expect(page.getByTestId("language-switcher")).toHaveAttribute(
      "data-locale",
      "en",
    );
    await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
    await expect(
      page.getByTestId("empty-board").getByText("Name origin and destination"),
    ).toBeVisible();
    await expect(
      page.getByTestId("empty-board").getByText("Add a stop if you need one"),
    ).toBeVisible();
  });

  test("keeps the hall mast readable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const strip = page.locator(".desk-strip");
    const clock = page.getByTestId("station-clock");
    const dark = page.getByRole("button", { name: "Dark" });

    await expect(page.getByRole("heading", { name: "Linia" })).toBeVisible();
    await expect(page.getByTestId("language-switcher")).toBeVisible();
    await expect(dark).toBeVisible();
    await expect(clock).toBeVisible();

    const stripBox = await strip.boundingBox();
    const clockBox = await clock.boundingBox();
    const darkBox = await dark.boundingBox();
    expect(stripBox).toBeTruthy();
    expect(clockBox).toBeTruthy();
    expect(darkBox).toBeTruthy();

    function overlap(
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) {
      return !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
      );
    }

    expect(overlap(stripBox!, clockBox!)).toBe(false);
    expect(overlap(darkBox!, clockBox!)).toBe(false);
    expect(clockBox!.y).toBeGreaterThan(stripBox!.y + stripBox!.height - 1);
  });

  test("exposes hall metadata for crawlers", async ({ page, request }) => {
    await page.goto("/en");

    await expect(page).toHaveTitle("Linia — European bus and train search");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en\/?$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="sk"]')).toHaveAttribute(
      "href",
      /\/sk\/?$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/en\/?$/,
    );
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /index/,
    );
    await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute(
      "content",
      /max-image-preview:large/,
    );

    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    ) as { "@graph"?: Array<{ "@type"?: string }> };
    const types = (jsonLd["@graph"] ?? []).map((node) => node["@type"]);
    expect(types).toContain("WebApplication");
    expect(types).toContain("WebSite");
    expect(types).toContain("WebPage");
    expect(types).toContain("Organization");

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Search live bus and train itineraries across Europe using open Transitous data.",
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      "Search live bus and train itineraries across Europe using open Transitous data.",
    );
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      "content",
      /\/en\/opengraph-image/,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="sitemap"]')).toHaveAttribute(
      "href",
      /sitemap\.xml/,
    );

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(robots.headers()["cache-control"]).toMatch(/max-age=3600/);
    const robotsText = await robots.text();
    expect(robotsText).toContain("User-agent: *");
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain("sitemap.xml");
    expect(robotsText).toContain("User-agent: Googlebot");
    expect(robotsText).toContain("Disallow: /*/ticket-og");
    expect(robotsText).toMatch(/^Host: /m);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(sitemap.headers()["cache-control"]).toMatch(/max-age=3600/);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("/en");
    expect(sitemapText).toContain("/sk");
    expect(sitemapText).toContain("/uk");
    expect(sitemapText).toContain('hreflang="x-default"');
    expect(sitemapText).toContain('hreflang="sk"');
    expect(sitemapText).toContain("/en/opengraph-image");
    expect(sitemapText).not.toContain("ticket-og");

    const llms = await request.get("/llms.txt");
    expect(llms.ok()).toBeTruthy();
    expect(llms.headers()["content-type"]).toMatch(/text\/plain/);
    const llmsText = await llms.text();
    expect(llmsText).toContain("# Linia");
    expect(llmsText).toContain("/en");
    expect(llmsText).toContain("/sk");
    expect(llmsText).toContain("sitemap.xml");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const manifestJson = (await manifest.json()) as { name?: string };
    expect(manifestJson.name).toBe("Linia");
  });

  test("shows Slovak hall metadata", async ({ page }) => {
    await page.goto("/sk");
    await expect(page).toHaveTitle("Linia — vyhľadávanie autobusov a vlakov v Európe");
    await expect(page.locator("html")).toHaveAttribute("lang", "sk");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Hľadajte živé autobusové a vlakové spojenia po Európe z otvorených dát Transitous.",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/sk\/?$/,
    );
  });

  test("keeps the map folded on a phone until it is unfolded", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const pocket = page.getByTestId("map-pocket");
    await expect(pocket).toBeVisible();
    await expect(pocket).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("pin-origin")).toBeHidden();

    await pocket.click();
    await expect(pocket).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Pin origin" })).toBeVisible();
    await expect(page.getByTestId("map-here")).toBeVisible();
    await expect(page.getByTestId("map-fullscreen")).toBeVisible();

    const map = page.locator(".map-stage");
    const box = await map.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(160);
  });

  test("walks through the hall from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "How to use Linia" }).click();
    await expect(page.getByTestId("hall-tour")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How to use this hall" }),
    ).toBeVisible();
    await page.getByTestId("hall-tour").getByRole("button", { name: "Next" }).click();
    await expect(page.getByTestId("hall-tour")).toContainText("Pick origin");
    await page.getByRole("combobox", { name: "Origin" }).fill("Berlin");
    await expect(page.getByRole("option", { name: /Berlin Hbf/ })).toBeVisible();
    await page.getByRole("option", { name: /Berlin Hbf/ }).click();
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Berlin Hbf");
    await page.getByTestId("hall-tour").getByRole("button", { name: "Next" }).click();
    await expect(page.getByTestId("hall-tour")).toContainText("Pick destination");
    await page.getByRole("combobox", { name: "Destination" }).fill("Prague");
    await expect(page.getByRole("option", { name: /Praha hl\.n\./ })).toBeVisible();
    await page.getByRole("option", { name: /Praha hl\.n\./ }).click();
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue(
      "Praha hl.n.",
    );
    await page.getByRole("button", { name: "Close notice" }).click();
    await expect(page.getByTestId("hall-tour")).toHaveCount(0);
  });

  test("switches to dark mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("switches the board to Slovak", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "sk");

    await expect(page).toHaveURL(/\/sk\/?$/);
    await expect(page.getByRole("combobox", { name: "Odkiaľ" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Kam" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Odkiaľ som" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nájsť spojenia" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Vyhľadávanie spojenia" })).toBeVisible();
  });

  test("switches the board to German", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "de");

    await expect(page).toHaveURL(/\/de\/?$/);
    await expect(page.getByRole("combobox", { name: "Von" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Nach" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Verbindungen suchen" })).toBeVisible();
  });

  test("switches the board to French", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "fr");

    await expect(page).toHaveURL(/\/fr\/?$/);
    await expect(page.getByRole("combobox", { name: "De" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Vers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trouver des trajets" })).toBeVisible();
  });

  test("switches the board to Czech", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "cs");

    await expect(page).toHaveURL(/\/cs\/?$/);
    await expect(page.getByRole("combobox", { name: "Odkud" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Najít spojení" })).toBeVisible();
  });

  test("switches the board to Italian", async ({ page }) => {
    await page.goto("/");
    await selectLocale(page, "it");

    await expect(page).toHaveURL(/\/it\/?$/);
    await expect(page.getByRole("combobox", { name: "Partenza" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trova collegamenti" })).toBeVisible();
  });

  test("opens a paper country picker with every hall language", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-switcher").click();

    await expect(page.getByTestId("lang-sheet")).toBeVisible();
    await expect(page.getByTestId("lang-option-en")).toContainText("English");
    await expect(page.getByTestId("lang-option-sk")).toContainText("Slovenčina");
    await expect(page.getByTestId("lang-option-cs")).toContainText("Čeština");
    await expect(page.getByTestId("lang-option-de")).toContainText("Deutsch");
    await expect(page.getByTestId("lang-option-pl")).toContainText("Polski");
    await expect(page.getByTestId("lang-option-hu")).toContainText("Magyar");
    await expect(page.getByTestId("lang-option-fr")).toContainText("Français");
    await expect(page.getByTestId("lang-option-it")).toContainText("Italiano");
    await expect(page.getByTestId("lang-option-es")).toContainText("Español");
    await expect(page.getByTestId("lang-option-nl")).toContainText("Nederlands");
    await expect(page.getByTestId("lang-option-ro")).toContainText("Română");
    await expect(page.getByTestId("lang-option-hr")).toContainText("Hrvatski");
    await expect(page.getByTestId("lang-option-uk")).toContainText("Українська");
  });

  test("shows the locale code on the language stamp", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("language-switcher").locator(".lang-switch-code")).toHaveText(
      "en",
    );
    await selectLocale(page, "sk");
    await expect(page.getByTestId("language-switcher").locator(".lang-switch-code")).toHaveText(
      "sk",
    );
  });

  test("can follow system appearance", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "System" }).click();
    await expect(page.getByRole("button", { name: "System" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("special routes", () => {
  test("shows a branded 404 board for unknown paths", async ({ page }) => {
    await page.goto("/this-platform-does-not-exist");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This platform is empty" })).toBeVisible();
    await page.getByRole("link", { name: "Back to the hall" }).click();
    await expect(page.getByRole("heading", { name: "Linia" })).toBeVisible();
  });

  test("keeps unknown platforms out of the index", async ({ page }) => {
    await page.goto("/en/this-platform-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});

test.describe("search form validation", () => {
  test("shows field errors when searching without places", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Find connections" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Choose an origin" })).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "Choose a destination" }),
    ).toBeVisible();
    await expect(page.getByTestId("journey-results")).toHaveCount(0);
  });

  test("prints Slovak validation when the hall is in Slovak", async ({
    page,
  }) => {
    await page.goto("/sk");
    await page.getByRole("button", { name: "Nájsť spojenia" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Vyberte východisko" }),
    ).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "Vyberte cieľ" }),
    ).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Choose an origin" })).toHaveCount(
      0,
    );
  });

  test("explains a typed station that was not picked from the list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Origin" }).fill("zzzz");
    await expect(
      page.getByRole("alert").filter({ hasText: "No matching places" }),
    ).toBeVisible();
  });

  test("clears typed origin with the field button", async ({ page }) => {
    await page.goto("/");
    const origin = page.getByRole("combobox", { name: "Origin" });
    await origin.fill("Berlin");
    await expect(origin).toHaveValue("Berlin");

    await page.getByRole("button", { name: "Clear origin" }).click();
    await expect(origin).toHaveValue("");
  });

  test("says when place search cannot reach the network", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Origin" }).fill("failnet");
    await expect(page.getByTestId("geocode-failed")).toBeVisible();
    await expect(page.getByTestId("geocode-failed")).toHaveText(
      "Places could not be loaded. Try again.",
    );
  });

  test("clears the whole ticket after a search", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");
    await page.getByRole("button", { name: "Find connections" }).click();

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await page.getByRole("button", { name: "Clear ticket" }).click();

    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue("");
    await expect(page.getByTestId("empty-board")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear ticket" })).toHaveCount(0);
    await expect(page.getByTestId("recent-searches")).toBeVisible();
    await expect(page.getByTestId("recent-searches").getByText("Berlin Hbf")).toBeVisible();
    await expect(page.locator(".journey-path, .journey-preview")).toHaveCount(0);
  });

  test("wipes the map line when origin is cleared", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.locator(".journey-path, .journey-preview")).not.toHaveCount(0);

    await page.getByRole("button", { name: "Clear Origin" }).click();

    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("");
    await expect(page.getByTestId("empty-board")).toBeVisible();
    await expect(page.locator(".journey-path, .journey-preview")).toHaveCount(0);
  });

  test("reprints a recent search from the empty board", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await page.getByRole("button", { name: "Clear ticket" }).click();
    await expect(page.getByTestId("recent-searches")).toBeVisible();

    await page.getByTestId("recent-searches").getByRole("button").first().click();

    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Berlin Hbf");
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue(
      "Praha hl.n.",
    );
    await expect(page.getByTestId("journey-results")).toBeVisible();
  });
});

test.describe("journey search", () => {
  test("finds a mocked Berlin to Prague connection", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");
    await page.getByRole("button", { name: "Find connections" }).click();

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("1 connection")).toBeVisible();
    await expect(
      page.getByTestId("journey-results").getByRole("button", { name: "Deutsche Bahn" }),
    ).toBeVisible();
    await expect(page.getByText("EC 172").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "The line, stop by stop" })).toBeVisible();
    await expect(page.getByText("1 stop")).toBeVisible();
    await page.getByText("1 stop").click();
    await expect(page.getByText("Dresden Hbf")).toBeVisible();
    await expect(page.getByTestId("earlier-connections")).toBeVisible();
    await expect(page.getByTestId("later-connections")).toBeVisible();
    await expect(page.getByTestId("refresh-live")).toBeVisible();
    await expect(page.getByTestId("sort-fastest")).toBeVisible();
    await expect(page.getByTestId("sort-transfers")).toBeVisible();
    await expect(page.getByTestId("return-trip")).toBeVisible();
    await expect(page.getByTestId("accessible")).toBeVisible();
    await expect(page.getByTestId("bike")).toBeVisible();
    await expect(page.getByTestId("night-rail")).toBeVisible();
    await expect(page.getByTestId("pin-line")).toBeVisible();
    await expect(page.getByTestId("alert-ribbon")).toBeVisible();
    await expect(
      page.getByTestId("journey-results").getByRole("option", { selected: true }),
    ).toContainText("EC 172");
  });

  test("shares a public link that reopens the connection", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");
    await page.getByRole("button", { name: "Find connections" }).click();
    await expect(page.getByTestId("journey-results")).toBeVisible();

    await page.getByTestId("share-open").click();
    await expect(page.getByTestId("share-dialog")).toBeVisible();
    const shareUrl = await page.getByTestId("share-url").inputValue();
    expect(shareUrl).toContain("from=");
    expect(shareUrl).toContain("to=");
    await expect(page.getByTestId("print-ticket")).toBeHidden();
    await expect(page.getByTestId("print-ticket")).toContainText("Berlin Hbf");
    await expect(page.getByTestId("print-ticket")).toContainText("EC 172");
    await expect(page.getByTestId("share-calendar")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("share-calendar").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ics$/);

    await page.goto(shareUrl);
    await expect(page).toHaveTitle(/Berlin Hbf/);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Berlin Hbf");
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue(
      "Praha hl.n.",
    );
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("swaps origin and destination", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");

    await page.getByRole("button", { name: "Swap origin and destination" }).click();

    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(
      "Praha hl.n.",
    );
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue(
      "Berlin Hbf",
    );
  });

  test("finds connections as soon as origin and destination are set", async ({
    page,
  }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("adds a via stop and still finds connections", async ({ page }) => {
    await page.goto("/");
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await page.getByRole("button", { name: "Via stops" }).click();
    await selectPlace(page, "Via 1", "Dresden", "Dresden Hbf");
    await selectPlace(page, "Destination", "Prague", "Praha hl.n.");

    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("1 connection")).toBeVisible();
  });

  test("marks a shared ticket as noindex", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await page.getByTestId("share-open").click();
    const shareUrl = await page.getByTestId("share-url").inputValue();

    await page.goto(shareUrl);
    await expect(page).toHaveTitle(/Berlin Hbf/);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("sorts the board and still shows the connection", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();

    await page.getByTestId("sort-fastest").click();
    await expect(page.getByTestId("sort-fastest")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("EC 172").first()).toBeVisible();

    await page.getByTestId("sort-transfers").click();
    await expect(page.getByTestId("sort-transfers")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("hides the direct mock when transfers are stamped, then resets", async ({
    page,
  }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results").getByText("EC 172").first()).toBeVisible();

    await page
      .getByRole("group", { name: "Direct or transfers" })
      .getByRole("button", { name: /Transfers/ })
      .click();
    await expect(page.getByTestId("reset-filters")).toBeVisible();
    await expect(page.getByTestId("journey-results").getByText("EC 172")).toHaveCount(0);

    await page.getByTestId("reset-filters").click();
    await expect(page.getByTestId("journey-results").getByText("EC 172").first()).toBeVisible();
  });

  test("asks for later connections without leaving the board", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await page.getByTestId("later-connections").click();
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText("EC 172").first()).toBeVisible();
  });

  test("prints a return as a second date on the same hall", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results").getByText("EC 172").first()).toBeVisible();
    await page.getByTestId("return-trip").click();

    await expect(page.getByTestId("return-date")).toBeVisible();
    await expect(page.getByTestId("hall-leg-outbound")).toBeVisible();
    await expect(page.getByTestId("hall-leg-inbound")).toBeVisible();
    await page.getByTestId("hall-leg-inbound").click();
    await expect(page.getByText("EC 173").first()).toBeVisible();
  });

  test("reads a station board from one stop", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("station-board-mode").click();
    await selectPlace(page, "Origin", "Berlin", "Berlin Hbf");
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveCount(0);
    await expect(page.getByTestId("station-board")).toBeVisible();
    await expect(page.getByTestId("station-row-0")).toContainText("EC 172");
    await page.getByTestId("station-row-0").click();
    await expect(page.getByRole("heading", { name: "The line, stop by stop" })).toBeVisible();
  });

  test("can remove a via stop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Via stops" }).click();
    await selectPlace(page, "Via 1", "Dresden", "Dresden Hbf");
    await page.getByRole("button", { name: "Remove via 1" }).click();
    await expect(page.getByRole("combobox", { name: "Via 1" })).toHaveCount(0);
  });

  test("pins origin then arms destination", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("pin-origin").click();
    await expect(page.getByTestId("pin-origin")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await clickLeaflet(page);

    await expect(page.getByRole("combobox", { name: "Origin" })).not.toHaveValue(
      "",
    );
    await expect(page.getByTestId("pin-destination")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("pins a stop between origin and destination", async ({ page }) => {
    await page.goto("/");
    await searchBerlinPrague(page);
    await expect(page.getByTestId("journey-results")).toBeVisible();
    await expect(page.getByText(/set a via stop/)).toBeVisible();

    await clickLeaflet(page);

    await expect(page.getByRole("combobox", { name: "Via 1" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Via 1" })).not.toHaveValue(
      "",
    );
  });
});
