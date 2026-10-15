import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const catalog = JSON.parse(
  await readFile(path.join(__dirname, "../data/catalog.json"), "utf-8"),
);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCatalog() {
  const latency = 100 + Math.random() * 700;
  await wait(latency);

  if (Math.random() < 0.2) {
    throw new Error("upstream catalog failed");
  }

  return catalog;
}
