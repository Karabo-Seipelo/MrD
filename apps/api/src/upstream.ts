import { listAllOffers, listCatalogProducts } from "@mrd/db";
import { type Product } from "./search.js";

export type CatalogReview = {
  id: number;
  rating: number;
  comment: string;
  date: string;
};

export type CatalogProduct = Product & {
  discountPercentage?: number;
  rating?: number;
  stock?: number;
  sku: string;
  weight: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  warrantyInformation: string;
  reviews?: CatalogReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
  images: string[];
  thumbnail: string;
};

export type Catalog = {
  products: CatalogProduct[];
};

export type Offer = {
  id: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
};

let catalogProducts: CatalogProduct[] = [];
let offers = new Map<number, Offer>();
let initialized = false;

function assertOfferIdsMatchProducts(
  products: Product[],
  offerList: Offer[],
): void {
  const productIds = new Set(products.map((product) => product.id));
  const offerIds = new Set(offerList.map((offer) => offer.id));

  if (productIds.size !== offerIds.size) {
    throw new Error("catalog product ids and offer ids must match");
  }

  for (const id of productIds) {
    if (!offerIds.has(id)) {
      throw new Error(`missing offer for product id ${id}`);
    }
  }
}

function setOffers(offerList: Offer[], products: Product[]): void {
  assertOfferIdsMatchProducts(products, offerList);
  offers = new Map(offerList.map((offer) => [offer.id, offer]));
}

export async function initUpstream(): Promise<void> {
  if (initialized) return;

  if (process.env.USE_DATABASE !== "1") {
    throw new Error(
      "USE_DATABASE=1 is required; seed Postgres with pnpm db:seed after supabase start",
    );
  }

  catalogProducts = (await listCatalogProducts()) as CatalogProduct[];
  setOffers(await listAllOffers(), catalogProducts);
  initialized = true;
}

export const catalog: Catalog = {
  get products() {
    if (!initialized) {
      throw new Error("upstream not initialized; call initUpstream() first");
    }
    return catalogProducts;
  },
};

export function productsByIds(ids: number[]): CatalogProduct[] {
  const wanted = new Set(ids);
  return catalog.products.filter((product) => wanted.has(product.id));
}

export function listCategories(): string[] {
  const names: string[] = catalog.products.map((product) => product.category);
  return [...new Set(names)].sort();
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const WHOLESALE_FAIL_RATE = 0.2;
const PER_OFFER_FAIL_RATE = 0.15;

export async function fetchOffers(ids: number[]): Promise<Offer[]> {
  const latency = 100 + Math.random() * 700;
  await wait(latency);

  if (Math.random() < WHOLESALE_FAIL_RATE) {
    throw new Error("upstream offers failed");
  }

  return ids.flatMap((id) => {
    if (Math.random() < PER_OFFER_FAIL_RATE) return [];
    const offer = offers.get(id);
    return offer ? [offer] : [];
  });
}
