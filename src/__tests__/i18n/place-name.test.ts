import { describe, expect, it } from "vitest";
import { localizePlaceName } from "@/i18n/place-name";
import { en } from "@/i18n/messages/en";
import { it as itMessages } from "@/i18n/messages/it";
import { sk } from "@/i18n/messages/sk";

describe("localizePlaceName", () => {
  it("prints Slovak type names instead of English OSM suffixes", () => {
    expect(localizePlaceName("Bardejov (bus station)", sk.placeKind)).toBe(
      "Bardejov (autobusová stanica)",
    );
    expect(localizePlaceName("Klučov (train station)", sk.placeKind)).toBe(
      "Klučov (železničná stanica)",
    );
  });

  it("prints Italian type names", () => {
    expect(localizePlaceName("Milano (train station)", itMessages.placeKind)).toBe(
      "Milano (stazione ferroviaria)",
    );
  });

  it("keeps English suffixes in English", () => {
    expect(localizePlaceName("Bardejov (bus station)", en.placeKind)).toBe(
      "Bardejov (bus station)",
    );
  });

  it("drops an unknown English type label when the hall is not English", () => {
    expect(localizePlaceName("Stebník (amenity)", sk.placeKind)).toBe("Stebník");
  });
});
