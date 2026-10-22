export function isEnriched(product) {
  return product.price != null && Boolean(product.availabilityStatus);
}

export function enrichmentStatus(products) {
  if (products.length === 0) return "ok";
  const enriched = products.filter(isEnriched).length;
  return enriched === products.length ? "ok" : "partial";
}
