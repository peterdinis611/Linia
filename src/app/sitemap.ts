import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { languageAlternateUrls, localeUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = languageAlternateUrls();

  return locales.map((locale) => ({
    url: localeUrl(locale),
    changeFrequency: "daily",
    priority: locale === "en" ? 1 : 0.8,
    alternates: { languages },
  }));
}
