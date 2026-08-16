import {
  defaultLocale,
  localeNames,
  localeOg,
  locales,
  type Locale,
} from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";
import { siteOrigin } from "@/lib/site";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function siteUrl(path = "/") {
  const origin = siteOrigin();
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localePath(locale: Locale) {
  return `/${locale}`;
}

export function localeUrl(locale: Locale) {
  return siteUrl(localePath(locale));
}

export function sitemapHref() {
  return siteUrl("/sitemap.xml");
}

export function llmsTxtHref() {
  return siteUrl("/llms.txt");
}

export type HrefLangMap = Record<Locale | "x-default", string>;

function hrefLangMap(toHref: (locale: Locale) => string): HrefLangMap {
  const languages = {
    "x-default": toHref(defaultLocale),
  } as HrefLangMap;
  for (const locale of locales) {
    languages[locale] = toHref(locale);
  }
  return languages;
}

export function languageAlternateUrls() {
  return hrefLangMap(localeUrl);
}

export function localeOgImagePath(locale: Locale) {
  return `${localePath(locale)}/opengraph-image`;
}

export function localeOgImage(locale: Locale, alt: string) {
  return {
    url: localeOgImagePath(locale),
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    alt,
    type: "image/png" as const,
  };
}

export function hallMetadata(locale: Locale, dict: Messages) {
  const url = localeUrl(locale);
  const image = localeOgImage(locale, dict.meta.title);
  return {
    metadataBase: new URL(siteOrigin()),
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: "Linia",
    keywords: dict.meta.keywords,
    category: "travel",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      siteName: "Linia",
      type: "website" as const,
      locale: localeOg[locale],
      alternateLocale: locales
        .filter((item) => item !== locale)
        .map((item) => localeOg[item]),
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: dict.meta.title,
      description: dict.meta.description,
      images: [image.url],
    },
    alternates: {
      canonical: url,
      languages: languageAlternateUrls(),
    },
  };
}

export function hallRobots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: ["Googlebot", "Googlebot-Image"],
        allow: "/",
        disallow: ["/*/ticket-og"],
      },
    ],
    sitemap: sitemapHref(),
    host: new URL(siteUrl()).host,
  };
}

export function hallSitemap() {
  const languages = languageAlternateUrls();
  return locales.map((locale) => ({
    url: localeUrl(locale),
    changeFrequency: "daily" as const,
    priority: locale === defaultLocale ? 1 : 0.8,
    alternates: { languages },
    images: [siteUrl(localeOgImagePath(locale))],
  }));
}

export function hallLlmsTxt() {
  const halls = locales
    .map((locale) => `- [${localeNames[locale]}](${localeUrl(locale)})`)
    .join("\n");

  return `# Linia

> Search live bus and train itineraries across Europe using open Transitous data. No accounts. No booking.

Linia is a public timetable hall. Name origin and destination, stamp the clock, and read the board. Routing comes from Transitous (MOTIS).

## Halls

${halls}

## Optional

- [Sitemap](${sitemapHref()})
- [Robots](${siteUrl("/robots.txt")})
`;
}

export function hallJsonLd(locale: Locale, dict: Messages) {
  const origin = siteOrigin();
  const url = localeUrl(locale);
  const image = siteUrl(localeOgImagePath(locale));
  const organization = `${origin}/#organization`;
  const website = `${origin}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name: "Linia",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: siteUrl("/apple-icon"),
          width: 180,
          height: 180,
        },
      },
      {
        "@type": "WebSite",
        "@id": website,
        name: "Linia",
        url: origin,
        description: dict.meta.description,
        inLanguage: [...locales],
        publisher: { "@id": organization },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: dict.meta.title,
        description: dict.meta.description,
        inLanguage: locale,
        isPartOf: { "@id": website },
        primaryImageOfPage: image,
        publisher: { "@id": organization },
      },
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: "Linia",
        url,
        description: dict.meta.description,
        applicationCategory: "TravelApplication",
        operatingSystem: "All",
        isAccessibleForFree: true,
        inLanguage: locale,
        image,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        publisher: { "@id": organization },
      },
    ],
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
