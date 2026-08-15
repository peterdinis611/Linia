export const locales = [
  "en",
  "sk",
  "cs",
  "de",
  "pl",
  "hu",
  "fr",
  "it",
  "es",
  "nl",
  "ro",
  "hr",
  "uk",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookie = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  en: "English",
  sk: "Slovenčina",
  cs: "Čeština",
  de: "Deutsch",
  pl: "Polski",
  hu: "Magyar",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  nl: "Nederlands",
  ro: "Română",
  hr: "Hrvatski",
  uk: "Українська",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  sk: "🇸🇰",
  cs: "🇨🇿",
  de: "🇩🇪",
  pl: "🇵🇱",
  hu: "🇭🇺",
  fr: "🇫🇷",
  it: "🇮🇹",
  es: "🇪🇸",
  nl: "🇳🇱",
  ro: "🇷🇴",
  hr: "🇭🇷",
  uk: "🇺🇦",
};

export const localeOg: Record<Locale, string> = {
  en: "en_GB",
  sk: "sk_SK",
  cs: "cs_CZ",
  de: "de_DE",
  pl: "pl_PL",
  hu: "hu_HU",
  fr: "fr_FR",
  it: "it_IT",
  es: "es_ES",
  nl: "nl_NL",
  ro: "ro_RO",
  hr: "hr_HR",
  uk: "uk_UA",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qualityPart = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityPart ? Number(qualityPart.trim().slice(2)) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}
