export type CatalogProductInput = Record<string, unknown> & {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
};

export type OfferSeedRow = {
  productId: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
};

export type ProductSeedRow = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  tags: string[];
  payload: Record<string, unknown>;
};

const LEGACY_OFFER_KEYS = [
  "price",
  "availabilityStatus",
  "shippingInformation",
] as const;

function isLegacyOfferFields(
  product: CatalogProductInput,
): product is CatalogProductInput & {
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
} {
  return (
    typeof product.price === "number" &&
    typeof product.availabilityStatus === "string" &&
    typeof product.shippingInformation === "string"
  );
}

function legacyOfferFromProduct(
  product: CatalogProductInput,
): OfferSeedRow | null {
  if (!isLegacyOfferFields(product)) {
    return null;
  }
  return {
    productId: product.id,
    price: product.price,
    availabilityStatus: product.availabilityStatus,
    shippingInformation: product.shippingInformation,
  };
}

function stripLegacyOfferFields(
  rest: Record<string, unknown>,
): Record<string, unknown> {
  const payload = { ...rest };
  for (const key of LEGACY_OFFER_KEYS) {
    delete payload[key];
  }
  return payload;
}

/** Merge offers from `offers.json` with legacy inline fields on catalog products. File rows win on id clash. */
export function mergeOfferSeedRows(
  fromOffersFile: Array<{
    id: number;
    price: number;
    availabilityStatus: string;
    shippingInformation: string;
  }>,
  catalogProducts: CatalogProductInput[],
): OfferSeedRow[] {
  const byProductId = new Map<number, OfferSeedRow>();

  for (const product of catalogProducts) {
    const legacy = legacyOfferFromProduct(product);
    if (legacy) {
      byProductId.set(legacy.productId, legacy);
    }
  }

  for (const offer of fromOffersFile) {
    byProductId.set(offer.id, {
      productId: offer.id,
      price: offer.price,
      availabilityStatus: offer.availabilityStatus,
      shippingInformation: offer.shippingInformation,
    });
  }

  return [...byProductId.values()].sort((a, b) => a.productId - b.productId);
}

export function buildProductSeedRows(
  catalogProducts: CatalogProductInput[],
): ProductSeedRow[] {
  return catalogProducts.map((product) => {
    const { id, title, description, category, brand, tags, ...rest } = product;
    return {
      id,
      title,
      description,
      category,
      brand: brand ?? null,
      tags: Array.isArray(tags) ? tags : [],
      payload: stripLegacyOfferFields(rest),
    };
  });
}
