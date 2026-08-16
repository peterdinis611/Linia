import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "@/i18n/config";
import {
  hallJsonLd,
  hallLlmsTxt,
  hallMetadata,
  hallRobots,
  hallSitemap,
  languageAlternateUrls,
  localeOgImagePath,
  localePath,
  localeUrl,
  siteUrl,
} from "@/lib/seo";
import { en } from "@/i18n/messages/en";
import { sk } from "@/i18n/messages/sk";

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

describe("hall metadata", () => {
  it("prints description, canonical, og:image, and twitter card", () => {
    const meta = hallMetadata("en", en);
    expect(meta.description).toBe(en.meta.description);
    expect(meta.alternates?.canonical).toBe(localeUrl("en"));
    expect(meta.openGraph?.url).toBe(localeUrl("en"));
    expect(meta.openGraph?.description).toBe(en.meta.description);
    expect(meta.openGraph?.images).toEqual([
      {
        url: localeOgImagePath("en"),
        width: 1200,
        height: 630,
        alt: en.meta.title,
        type: "image/png",
      },
    ]);
    expect(meta.twitter?.images).toEqual([localeOgImagePath("en")]);
    expect(meta.alternates?.languages?.sk).toBe(localeUrl("sk"));
  });

  it("keeps the Slovak description on the Slovak hall", () => {
    const meta = hallMetadata("sk", sk);
    expect(meta.description).toBe(sk.meta.description);
    expect(meta.alternates?.canonical).toBe(localeUrl("sk"));
    expect(meta.openGraph?.locale).toBe("sk_SK");
  });
});

describe("structured data", () => {
  it("describes the hall as a free travel app with a page and a logo", () => {
    const graph = hallJsonLd("sk", sk)["@graph"];
    const types = graph.map((node) => node["@type"]);
    expect(types).toEqual([
      "Organization",
      "WebSite",
      "WebPage",
      "WebApplication",
    ]);

    const page = graph.find((node) => node["@type"] === "WebPage");
    expect(page).toMatchObject({
      url: localeUrl("sk"),
      name: sk.meta.title,
      description: sk.meta.description,
      inLanguage: "sk",
    });

    const org = graph.find((node) => node["@type"] === "Organization");
    expect(org).toMatchObject({
      name: "Linia",
      logo: { url: siteUrl("/apple-icon") },
    });
  });
});

describe("llms.txt", () => {
  it("lists every hall and points crawlers at the sitemap", () => {
    const text = hallLlmsTxt();
    expect(text).toContain("# Linia");
    expect(text).toContain(localeUrl("en"));
    expect(text).toContain(localeUrl("sk"));
    expect(text).toContain(localeUrl("uk"));
    expect(text).toContain("Slovenčina");
    expect(text).toContain(siteUrl("/sitemap.xml"));
    expect(text).toContain(siteUrl("/robots.txt"));
  });
});
