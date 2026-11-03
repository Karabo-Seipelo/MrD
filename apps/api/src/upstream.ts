import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const catalog = JSON.parse(
  await readFile(path.join(__dirname, "../data/catalog.json"), "utf-8"),
) as Catalog;

export type Offer = {
  id: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
};

const offersFile = JSON.parse(
  await readFile(path.join(__dirname, "../data/offers.json"), "utf-8"),
) as { offers: Offer[] };

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

assertOfferIdsMatchProducts(catalog.products, offersFile.offers);

let offersLoadedAt = Date.now();
let offers = new Map<number, Offer>(
  offersFile.offers.map((offer) => [offer.id, offer]),
);

const OFFERS_RELOAD_MS = (() => {
  const raw = process.env.OFFERS_RELOAD_MS;
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
})();

async function reloadOffersIfStale(): Promise<void> {
  if (OFFERS_RELOAD_MS === 0) return;
  if (Date.now() - offersLoadedAt < OFFERS_RELOAD_MS) return;

  const fresh = JSON.parse(
    await readFile(path.join(__dirname, "../data/offers.json"), "utf-8"),
  ) as { offers: Offer[] };

  assertOfferIdsMatchProducts(catalog.products, fresh.offers);
  offers = new Map(fresh.offers.map((offer) => [offer.id, offer]));
  offersLoadedAt = Date.now();
}

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
  await reloadOffersIfStale();
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
