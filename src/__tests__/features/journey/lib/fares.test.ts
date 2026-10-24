import { describe, expect, it } from "vitest";
import {
  fareProductsFromItinerary,
  formatFareProduct,
} from "@/features/journey/lib/fares";
import { railItinerary } from "@/test/fixtures";

describe("fares", () => {
  it("collects unique fare products when MOTIS returns them", () => {
    const itinerary = railItinerary({
      fareTransfers: [
        {
          products: [
            { name: "Single", amount: 3.5, currency: "EUR" },
            { name: "Single", amount: 3.5, currency: "EUR" },
            { name: "Day", amount: 9, currency: "EUR" },
            { name: "Missing" },
          ],
        },
      ],
    });
    expect(fareProductsFromItinerary(itinerary)).toEqual([
      { name: "Single", amount: 3.5, currency: "EUR" },
      { name: "Day", amount: 9, currency: "EUR" },
    ]);
  });

  it("formats a fare for the locale", () => {
    expect(
      formatFareProduct(
        { name: "Single", amount: 3.5, currency: "EUR" },
        "en-GB",
      ),
    ).toMatch(/Single/);
    expect(formatFareProduct({ name: "Only name" }, "en")).toBeNull();
  });
});
