import type { EnrichedProduct, Enrichment } from "./types.js";

export function isEnriched(product: EnrichedProduct): boolean {
  return product.price != null && Boolean(product.availabilityStatus);
}

export function enrichmentStatus(products: EnrichedProduct[]): Enrichment {
  if (products.length === 0) return "ok";
  const enriched = products.filter(isEnriched).length;
  if (enriched === products.length) return "ok";
  if (enriched === 0) return "failed";
  return "partial";
}
