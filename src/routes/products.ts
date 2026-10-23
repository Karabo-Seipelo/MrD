import { Router } from "express";
import {
  enrichProductsWithRetry,
  type Enrichment,
} from "../enrich.js";
import { fetchOffers, listCategories, catalog } from "../upstream.js";
import {
  paginate,
  parsePagination,
  queryProducts,
  suggestProducts,
  type Product,
} from "../search.js";

export type { EnrichedProduct, Enrichment } from "../enrich.js";
export { isEnriched, enrichmentStatus } from "../enrich.js";

export const productsRouter = Router();

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
  let attempts = 0;

  if (matches.length === 0) {
    res.json({
      products: [],
      total: 0,
      page,
      limit,
      query: q,
      enrichment,
    });
    const ms = Math.round(performance.now() - started);
    console.log(
      `search #${request} 200 ${ms}ms enrichment=${enrichment} attempts=${attempts} q=${JSON.stringify(q)}`,
    );
    return;
  }

  const enriched = await enrichProductsWithRetry(matches, sort, fetchOffers);
  const { products } = enriched;
  enrichment = enriched.enrichment;
  attempts = enriched.attempts;

  const total = products.length;
  const pageProducts = paginate(products, page, limit);

  res.json({
    products: pageProducts,
    total,
    page,
    limit,
    query: q,
    enrichment,
  });

  const ms = Math.round(performance.now() - started);
  console.log(
    `search #${request} 200 ${ms}ms enrichment=${enrichment} attempts=${attempts} q=${JSON.stringify(q)}`,
  );
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
