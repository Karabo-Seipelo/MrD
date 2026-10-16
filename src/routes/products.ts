import { Router } from "express";
import { fetchCatalog, listCategories, catalog } from "../upstream.js";
import { queryProducts, suggestProducts, type Product } from "../search.js";

export const productsRouter = Router();

let searchCount = 0;

productsRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

productsRouter.get("/products", async (req, res) => {
  const started = performance.now();
  const request = ++searchCount;
  let status = 503;

  try {
    const catalog = await fetchCatalog();
    const q = String(req.query.q ?? "");
    const category = String(req.query.category ?? "");
    const sort = String(req.query.sort ?? "asc");
    const products = queryProducts(
      catalog.products as Product[],
      q,
      category,
      sort,
    );

    res.json({
      products,
      total: products.length,
      query: q,
    });
    status = 200;
  } catch {
    res.status(503).json({
      error: "upstream catalog failed",
    });
  } finally {
    const ms = Math.round(performance.now() - started);
    console.log(
      `search #${request} ${status} ${ms}ms q=${JSON.stringify(String(req.query.q ?? ""))}`,
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
