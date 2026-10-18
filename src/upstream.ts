import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { type Product } from "./search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const catalog = JSON.parse(
  await readFile(path.join(__dirname, "../data/catalog.json"), "utf-8"),
);

export type Offer = {
  id: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
}

const offers = new Map<number, Offer>(
  catalog.products.map((product: Product) => [
    product.id,
    {
      id: product.id,
      price: product.price ?? 0,
      availabilityStatus: product.availabilityStatus ?? "",
      shippingInformation: product.shippingInformation ?? "",
    },
  ]),
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

export async function fetchOffers(ids: number[]): Promise<Offer[]> {
  const latency = 100 + Math.random() * 700;
  await wait(latency);

  if (Math.random() < 0.2) {
    throw new Error("upstream offers failed");
  }

  return ids.flatMap((id) => {
    const offer = offers.get(id);
    return offer ? [offer] : [];
  });
}
