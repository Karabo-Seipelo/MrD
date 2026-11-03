import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../../apps/api/data");

type CatalogFile = {
  products: Array<Record<string, unknown> & { id: number }>;
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

  for (const product of catalog.products) {
    const { id, title, description, category, brand, tags, ...rest } = product;

    await client.query(
      `insert into public.products (id, title, description, category, brand, tags, payload)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        title,
        description,
        category,
        brand ?? null,
        Array.isArray(tags) ? tags : [],
        JSON.stringify(rest),
      ],
    );
  }

  for (const offer of offersFile.offers) {
    await client.query(
      `insert into public.offers (product_id, price, availability_status, shipping_information)
       values ($1, $2, $3, $4)`,
      [
        offer.id,
        offer.price,
        offer.availabilityStatus,
        offer.shippingInformation,
      ],
    );
  }

  await client.query("commit");
  console.log(
    `seeded ${catalog.products.length} products and ${offersFile.offers.length} offers`,
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await closePool();
}
