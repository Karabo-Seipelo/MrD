import type { DbCatalogProduct } from "./types.js";
import { getPool } from "./pool.js";

export type OffersUpstreamMode = "up" | "partial" | "down";

export type EnrichedCatalogRow = DbCatalogProduct & {
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
};

export type SearchProductsParams = {
  q: string;
  category: string;
  sort: string;
  page: number;
  limit: number;
  offersMode: OffersUpstreamMode;
  /** When partial and null, even product ids are omitted from the offer join. */
  omitIds: number[] | null;
};

export type SearchProductsResult = {
  products: EnrichedCatalogRow[];
  total: number;
};

const SEARCHABLE = `lower(concat_ws(' ',
  p.title,
  p.description,
  p.category,
  coalesce(p.brand, ''),
  coalesce(array_to_string(p.tags, ' '), '')
))`;

function textMatchClause(paramIndex: number): string {
  return `($${paramIndex} = '' OR position(lower($${paramIndex}) in ${SEARCHABLE}) > 0)`;
}

function categoryClause(paramIndex: number): string {
  return `($${paramIndex} = '' OR lower(p.category) = lower($${paramIndex}))`;
}

function offerJoinClause(
  offersMode: OffersUpstreamMode,
  omitParamIndex: number,
): string {
  if (offersMode === "down") {
    return "";
  }

  const partialJoin = `(CASE
    WHEN $${omitParamIndex}::int[] IS NOT NULL AND cardinality($${omitParamIndex}::int[]) > 0
      THEN p.id <> all($${omitParamIndex}::int[])
    ELSE p.id % 2 <> 0
  END)`;

  if (offersMode === "partial") {
    return `left join public.offers o
      on o.product_id = p.id and ${partialJoin}`;
  }

  return `left join public.offers o on o.product_id = p.id`;
}

type ProductRow = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  tags: string[] | null;
  price: string | null;
  availability_status: string | null;
  shipping_information: string | null;
  total: string;
};

function mapRow(row: ProductRow): EnrichedCatalogRow {
  const product: EnrichedCatalogRow = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    brand: row.brand ?? undefined,
    tags: row.tags && row.tags.length > 0 ? row.tags : undefined,
  };

  if (row.price != null && row.availability_status != null) {
    product.price = Number(row.price);
    product.availabilityStatus = row.availability_status;
    product.shippingInformation = row.shipping_information ?? undefined;
  }

  return product;
}

export async function searchProducts(
  params: SearchProductsParams,
): Promise<SearchProductsResult> {
  const { q, category, sort, page, limit, offersMode, omitIds } = params;
  const offset = (page - 1) * limit;

  const values: unknown[] = [q, category];
  const where = `where ${textMatchClause(1)} and ${categoryClause(2)}`;

  if (offersMode === "down") {
    values.push(limit, offset);
    const limitIdx = 3;
    const offsetIdx = 4;
    const sql = `
      select
        p.id,
        p.title,
        p.description,
        p.category,
        p.brand,
        p.tags,
        null::numeric as price,
        null::text as availability_status,
        null::text as shipping_information,
        count(*) over()::text as total
      from public.products p
      ${where}
      order by p.id
      limit $${limitIdx} offset $${offsetIdx}`;

    const { rows } = await getPool().query<ProductRow>(sql, values);
    if (rows.length === 0) {
      return { products: [], total: 0 };
    }
    const total = Number.parseInt(rows[0].total, 10);
    return { products: rows.map(mapRow), total };
  }

  let join: string;
  if (offersMode === "partial") {
    values.push(omitIds ?? null);
    join = offerJoinClause("partial", 3);
  } else {
    join = offerJoinClause("up", 3);
  }

  const direction = sort === "desc" ? "desc" : "asc";
  values.push(limit, offset);
  const limitIdx = values.length - 1;
  const offsetIdx = values.length;

  const sql = `
    select
      p.id,
      p.title,
      p.description,
      p.category,
      p.brand,
      p.tags,
      o.price::text as price,
      o.availability_status,
      o.shipping_information,
      count(*) over()::text as total
    from public.products p
    ${join}
    ${where}
    order by o.price ${direction} nulls last, p.id
    limit $${limitIdx} offset $${offsetIdx}`;

  const { rows } = await getPool().query<ProductRow>(sql, values);
  if (rows.length === 0) {
    return { products: [], total: 0 };
  }
  const total = Number.parseInt(rows[0].total, 10);
  return { products: rows.map(mapRow), total };
}

export async function suggestProductTitles(
  q: string,
  limit: number,
): Promise<string[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const sql = `
    select title from (
      select
        p.title,
        row_number() over (partition by p.title order by p.id) as rn,
        p.id
      from public.products p
      where ${textMatchClause(1)}
    ) ranked
    where rn = 1
    order by id
    limit $2`;

  const { rows } = await getPool().query<{ title: string }>(sql, [
    trimmed,
    limit,
  ]);
  return rows.map((row) => row.title);
}
