import type { EnrichedProduct } from "./types.js";

export function mergeProductOffers(
  previous: EnrichedProduct[],
  incoming: EnrichedProduct[],
): EnrichedProduct[] {
  const prevById = new Map(previous.map((product) => [product.id, product]));
  return incoming.map((product) => {
    const prior = prevById.get(product.id);
    if (!prior) return product;
    return {
      ...product,
      price: product.price ?? prior.price,
      availabilityStatus:
        product.availabilityStatus ?? prior.availabilityStatus,
      shippingInformation:
        product.shippingInformation ?? prior.shippingInformation,
    };
  });
}
