import { describe, expect, it } from "vitest";
import { localizePlaceName } from "@/i18n/place-name";

describe("localizePlaceName", () => {
  it("prints Slovak type names instead of English OSM suffixes", () => {
    expect(localizePlaceName("Bardejov (bus station)", "sk")).toBe(
      "Bardejov (autobusová stanica)",
    );
    expect(localizePlaceName("Klučov (train station)", "sk")).toBe(
      "Klučov (železničná stanica)",
    );
  });

  it("prints Italian type names", () => {
    expect(localizePlaceName("Milano (train station)", "it")).toBe(
      "Milano (stazione ferroviaria)",
    );
  });

  it("keeps English suffixes in English", () => {
    expect(localizePlaceName("Bardejov (bus station)", "en")).toBe(
      "Bardejov (bus station)",
    );
  });

  it("drops an unknown English type label when the hall is not English", () => {
    expect(localizePlaceName("Stebník (amenity)", "sk")).toBe("Stebník");
  });
});
