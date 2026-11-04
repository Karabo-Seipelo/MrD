import type { DbCatalogProduct, DbOffer } from "@mrd/db";

export type ProductWithOffer = DbCatalogProduct & {
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
};

export function mergeOffersIntoProducts(
  products: DbCatalogProduct[],
  offers: DbOffer[],
): ProductWithOffer[] {
  const byId = new Map(offers.map((offer) => [offer.id, offer]));

  return products.map((product) => {
    const offer = byId.get(product.id);
    if (!offer) {
      return { ...product };
    }

    return {
      ...product,
      price: offer.price,
      availabilityStatus: offer.availabilityStatus,
      shippingInformation: offer.shippingInformation,
    };
  });
}
