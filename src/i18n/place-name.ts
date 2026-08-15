import { defaultLocale, isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionaries";
import type { Messages } from "./messages/en";

const KIND_KEYS: Record<string, keyof Messages["placeKind"]> = {
  "bus station": "busStation",
  "coach station": "busStation",
  "bus stop": "busStop",
  "train station": "trainStation",
  "railway station": "trainStation",
  "rail station": "trainStation",
  "tram stop": "tramStop",
  "tram station": "tramStation",
  "subway station": "subwayStation",
  "metro station": "subwayStation",
  "ferry terminal": "ferryTerminal",
  "ferry stop": "ferryTerminal",
  stop: "stop",
  station: "station",
  city: "city",
  town: "town",
  village: "village",
  hamlet: "hamlet",
  suburb: "suburb",
  platform: "platform",
  airport: "airport",
};

function kindFor(label: string): keyof Messages["placeKind"] | undefined {
  return KIND_KEYS[label.trim().toLowerCase()];
}

export function localizePlaceName(name: string, locale: string): string {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;
  const kinds = getDictionary(resolved).placeKind;
  return name
    .replace(/\s*\(([^)]+)\)\s*$/, (_, raw: string) => {
      const key = kindFor(raw);
      if (key) return ` (${kinds[key]})`;
      if (/^[a-z][a-z\s/-]*$/i.test(raw.trim())) return "";
      return ` (${raw.trim()})`;
    })
    .trim();
}
