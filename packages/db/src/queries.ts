import type { DbCatalogProduct, DbOffer } from "./types.js";
import { getPool } from "./pool.js";

type ProductRow = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  tags: string[] | null;
};

type OfferRow = {
  product_id: number;
  price: string;
  availability_status: string;
  shipping_information: string;
};

function mapProduct(row: ProductRow): DbCatalogProduct {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    brand: row.brand ?? undefined,
    tags: row.tags ?? undefined,
  };
}

function mapOffer(row: OfferRow): DbOffer {
  return {
    id: row.product_id,
    price: Number(row.price),
    availabilityStatus: row.availability_status,
    shippingInformation: row.shipping_information,
  };
}

export async function ping(): Promise<void> {
  const client = getPool();
  await client.query("select 1 as ok");
}

export async function listCatalogProducts(): Promise<DbCatalogProduct[]> {
  const { rows } = await getPool().query<ProductRow>(
    `select id, title, description, category, brand, tags
     from public.products
     order by id`,
  );
  return rows.map(mapProduct);
}

export async function listCategories(): Promise<string[]> {
  const { rows } = await getPool().query<{ category: string }>(
    `select distinct category from public.products order by category`,
  );
  return rows.map((row) => row.category);
}

export async function getCatalogProductsByIds(
  ids: number[],
): Promise<DbCatalogProduct[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<ProductRow>(
    `select id, title, description, category, brand, tags
     from public.products
     where id = any($1::int[])
     order by id`,
    [ids],
  );
  return rows.map(mapProduct);
}

export async function fetchOffersByIds(ids: number[]): Promise<DbOffer[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<OfferRow>(
    `select product_id, price, availability_status, shipping_information
     from public.offers
     where product_id = any($1::int[])
     order by product_id`,
    [ids],
  );
  return rows.map(mapOffer);
}

export async function listAllOffers(): Promise<DbOffer[]> {
  const { rows } = await getPool().query<OfferRow>(
    `select product_id, price, availability_status, shipping_information
     from public.offers
     order by product_id`,
  );
  return rows.map(mapOffer);
}
