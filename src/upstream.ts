import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { type Product } from "./search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let fetches = 0;

export const catalog = JSON.parse(
  await readFile(path.join(__dirname, "../data/catalog.json"), "utf-8"),
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

export async function fetchCatalog() {
  const latency = 1500 + Math.random() * 700;
  await wait(latency);

  fetches += 1;
  if (fetches % 10 === 0) {
    throw new Error("upstream catalog failed");
  }

  return catalog;
}
