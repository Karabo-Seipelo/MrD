import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { type Product } from "./search.js";

export type Catalog = {
  products: {
    id: number;
    title: string;
    description: string;
    category: string;
    brand?: string;
    tags?: string[];
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
    reviews: {
      id: number;
      rating: number;
      comment: string;
      date: string;
    }[];
    returnPolicy: string;
    minimumOrderQuantity: number;
    meta: {
      createdAt: string;
      updatedAt: string;
    };
    images: string[];
    thumbnail: string;
  }[];
}

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

assertOfferIdsMatchProducts(catalog.products as Product[], offersFile.offers);

const offers = new Map<number, Offer>(
  offersFile.offers.map((offer) => [offer.id, offer]),
);

export function listCategories(): string[] {
  const names: string[] = catalog.products.map(
    (product: Product) => product.category,
  );
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
