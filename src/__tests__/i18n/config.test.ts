import { describe, expect, it } from "vitest";
import { localeNeedsLatinExt, locales } from "@/i18n/config";

describe("localeNeedsLatinExt", () => {
  it("loads latin-ext for halls with Central European glyphs", () => {
    expect(localeNeedsLatinExt("sk")).toBe(true);
    expect(localeNeedsLatinExt("pl")).toBe(true);
    expect(localeNeedsLatinExt("hu")).toBe(true);
  });

  it("keeps Western halls on latin", () => {
    expect(localeNeedsLatinExt("en")).toBe(false);
    expect(localeNeedsLatinExt("de")).toBe(false);
    expect(localeNeedsLatinExt("fr")).toBe(false);
    expect(localeNeedsLatinExt("nl")).toBe(false);
  });

  it("covers every hall", () => {
    for (const locale of locales) {
      expect(typeof localeNeedsLatinExt(locale)).toBe("boolean");
    }
  });
});
