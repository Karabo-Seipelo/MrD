import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "../src/index.js";
import {
  buildProductSeedRows,
  mergeOfferSeedRows,
  type CatalogProductInput,
} from "../src/seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../../apps/api/data");

type CatalogFile = {
  products: CatalogProductInput[];
};

type OffersFile = {
  offers: Array<{
    id: number;
    price: number;
    availabilityStatus: string;
    shippingInformation: string;
  }>;
};

const catalog = JSON.parse(
  await readFile(path.join(dataDir, "catalog.json"), "utf-8"),
) as CatalogFile;

const offersFile = JSON.parse(
  await readFile(path.join(dataDir, "offers.json"), "utf-8"),
) as OffersFile;

const pool = getPool();
const client = await pool.connect();

try {
  await client.query("begin");
  await client.query(
    "truncate public.offers, public.products restart identity cascade",
  );

  const productRows = buildProductSeedRows(catalog.products);
  const offerRows = mergeOfferSeedRows(offersFile.offers, catalog.products);

  for (const product of productRows) {
    await client.query(
      `insert into public.products (id, title, description, category, brand, tags, payload)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        product.id,
        product.title,
        product.description,
        product.category,
        product.brand,
        product.tags,
        JSON.stringify(product.payload),
      ],
    );
  }

  for (const offer of offerRows) {
    await client.query(
      `insert into public.offers (product_id, price, availability_status, shipping_information)
       values ($1, $2, $3, $4)`,
      [
        offer.productId,
        offer.price,
        offer.availabilityStatus,
        offer.shippingInformation,
      ],
    );
  }

  await client.query("commit");
  console.log(
    `seeded ${productRows.length} products and ${offerRows.length} offers`,
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await closePool();
}
