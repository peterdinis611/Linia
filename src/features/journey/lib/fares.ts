import type { FareProduct, Itinerary } from "@/lib/transit/types";

/** Collect fare products MOTIS returned under withFares (may be empty). */
export function fareProductsFromItinerary(itinerary: Itinerary): FareProduct[] {
  const products: FareProduct[] = [];
  const seen = new Set<string>();
  for (const transfer of itinerary.fareTransfers ?? []) {
    for (const product of transfer.products ?? []) {
      if (product.amount == null || !product.currency) continue;
      const key = `${product.name}|${product.amount}|${product.currency}`;
      if (seen.has(key)) continue;
      seen.add(key);
      products.push(product);
    }
  }
  return products;
}

export function formatFareProduct(
  product: FareProduct,
  locale: string,
): string | null {
  if (product.amount == null || !product.currency) return null;
  try {
    const money = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: product.currency,
      maximumFractionDigits: 2,
    }).format(product.amount);
    return product.name ? `${product.name} · ${money}` : money;
  } catch {
    const raw = `${product.amount} ${product.currency}`;
    return product.name ? `${product.name} · ${raw}` : raw;
  }
}
