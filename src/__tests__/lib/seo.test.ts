import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "@/i18n/config";
import {
  hallRobots,
  hallSitemap,
  languageAlternateUrls,
  localeOgImagePath,
  localePath,
  localeUrl,
  siteUrl,
} from "@/lib/seo";

describe("site URLs", () => {
  it("joins origin and path without a double slash", () => {
    expect(siteUrl()).toMatch(/^https?:\/\//);
    expect(siteUrl("/")).toBe(siteUrl());
    expect(siteUrl("sitemap.xml")).toBe(`${siteUrl()}/sitemap.xml`);
    expect(siteUrl("/en")).toBe(`${siteUrl()}/en`);
  });

  it("prints a locale hall without a trailing slash", () => {
    expect(localePath("sk")).toBe("/sk");
    expect(localeUrl("sk")).toBe(`${siteUrl()}/sk`);
    expect(localeUrl(defaultLocale)).not.toMatch(/\/$/);
  });
});

describe("hreflang", () => {
  it("points x-default at English and lists every hall", () => {
    const languages = languageAlternateUrls();
    expect(languages["x-default"]).toBe(localeUrl(defaultLocale));
    for (const locale of locales) {
      expect(languages[locale]).toBe(localeUrl(locale));
    }
  });
});

describe("robots.txt", () => {
  it("lets crawlers into the hall and points them at the sitemap", () => {
    const robots = hallRobots();
    expect(robots.sitemap).toBe(siteUrl("/sitemap.xml"));
    expect(robots.host).toBe(new URL(siteUrl()).host);

    const open = robots.rules.find((rule) => rule.userAgent === "*");
    expect(open?.allow).toBe("/");
    expect(open?.disallow).toBeUndefined();
  });

  it("keeps generated share cards out of Google, not WhatsApp", () => {
    const google = hallRobots().rules.find((rule) =>
      Array.isArray(rule.userAgent) && rule.userAgent.includes("Googlebot"),
    );
    expect(google?.allow).toBe("/");
    expect(google?.disallow).toEqual(["/*/ticket-og"]);
  });
});

describe("sitemap.xml", () => {
  it("lists every locale hall once, with hreflang and an OG image", () => {
    const sitemap = hallSitemap();
    expect(sitemap).toHaveLength(locales.length);
    expect(sitemap.map((entry) => entry.url)).toEqual(
      locales.map((locale) => localeUrl(locale)),
    );

    const english = sitemap.find((entry) => entry.url === localeUrl("en"));
    const slovak = sitemap.find((entry) => entry.url === localeUrl("sk"));
    expect(english?.priority).toBe(1);
    expect(slovak?.priority).toBe(0.8);
    expect(english?.changeFrequency).toBe("daily");
    expect(english?.alternates?.languages?.["x-default"]).toBe(localeUrl("en"));
    expect(english?.alternates?.languages?.sk).toBe(localeUrl("sk"));
    expect(english?.images).toEqual([siteUrl(localeOgImagePath("en"))]);
    expect(slovak?.images).toEqual([siteUrl(localeOgImagePath("sk"))]);
  });

  it("does not list share tickets or the locale redirect", () => {
    const urls = hallSitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.includes("?"))).toBe(false);
    expect(urls).not.toContain(siteUrl("/"));
    expect(urls.some((url) => url.includes("ticket-og"))).toBe(false);
  });
});
