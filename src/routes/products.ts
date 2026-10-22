import { Router } from "express";
import { fetchOffers, listCategories, catalog } from "../upstream.js";
import {
  paginate,
  parsePagination,
  queryProducts,
  sortByPrice,
  suggestProducts,
  type Product,
} from "../search.js";

export const productsRouter = Router();

type EnrichedProduct = Product & {
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
};

export type Enrichment = "ok" | "partial" | "failed";

export function isEnriched(product: EnrichedProduct): boolean {
  return product.price != null && Boolean(product.availabilityStatus);
}

export function enrichmentStatus(products: EnrichedProduct[]): Enrichment {
  if (products.length === 0) return "ok";
  const enriched = products.filter(isEnriched).length;
  return enriched === products.length ? "ok" : "partial";
}

let searchCount = 0;

productsRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

productsRouter.get("/products", async (req, res) => {
  const started = performance.now();
  const request = ++searchCount;
  const q = String(req.query.q ?? "");
  const category = String(req.query.category ?? "");
  const sort = String(req.query.sort ?? "asc");
  const { page, limit } = parsePagination(req.query.page, req.query.limit);
  const matches = queryProducts(catalog.products as Product[], q, category);
  let enrichment: Enrichment = "ok";

  try {
    if (matches.length === 0) {
      res.json({
        products: [],
        total: 0,
        page,
        limit,
        query: q,
        enrichment,
      });
      return;
    }

    const offers = await fetchOffers(matches.map((product) => product.id));
    const byId = new Map(offers.map((offer) => [offer.id, offer]));
    const products = sortByPrice(
      matches.map((product) => ({
        ...product,
        ...byId.get(product.id),
      })),
      sort,
    );

    const total = products.length;
    const pageProducts = paginate(products, page, limit);
    enrichment = enrichmentStatus(pageProducts);

    res.json({
      products: pageProducts,
      total,
      page,
      limit,
      query: q,
      enrichment,
    });
  } catch {
    enrichment = "failed";
    const total = matches.length;
    res.json({
      products: paginate(matches, page, limit),
      total,
      page,
      limit,
      query: q,
      enrichment,
    });
  } finally {
    const ms = Math.round(performance.now() - started);
    console.log(
      `search #${request} 200 ${ms}ms enrichment=${enrichment} q=${JSON.stringify(q)}`,
    );
  }
});

productsRouter.get("/products/categories", async (_req, res) => {
  const categories = await listCategories();
  res.json({ categories });
});

productsRouter.get("/products/suggest", async (req, res) => {
  const q = String(req.query.q ?? "");
  const limit = Math.min(Number(req.query.limit) || 8, 20);
  const suggestions = suggestProducts(catalog.products as Product[], q, limit);
  res.json({ suggestions });
});
