import { defaultLocale, locales, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";
import { siteOrigin } from "@/lib/site";

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

export function languageAlternatePaths() {
  return {
    "x-default": localePath(defaultLocale),
    ...Object.fromEntries(locales.map((locale) => [locale, localePath(locale)])),
  };
}

export function languageAlternateUrls() {
  return {
    "x-default": localeUrl(defaultLocale),
    ...Object.fromEntries(locales.map((locale) => [locale, localeUrl(locale)])),
  };
}

export function localeOgImagePath(locale: Locale) {
  return `${localePath(locale)}/opengraph-image`;
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
    sitemap: siteUrl("/sitemap.xml"),
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

export function hallJsonLd(locale: Locale, dict: Messages) {
  const origin = siteOrigin();
  const url = localeUrl(locale);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Linia",
        url: origin,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Linia",
        url: origin,
        description: dict.meta.description,
        inLanguage: [...locales],
        publisher: { "@id": `${origin}/#organization` },
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
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
