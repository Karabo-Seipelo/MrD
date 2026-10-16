import { Router } from "express";
import { fetchCatalog, listCategories } from "../upstream.js";
import { queryProducts, type Product } from "../search.js";

export const productsRouter = Router();

productsRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

productsRouter.get("/products", async (req, res) => {
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
  } catch {
    res.status(503).json({
      error: "upstream catalog failed",
    });
  }
});

productsRouter.get("/products/categories", async (_req, res) => {
  const categories = await listCategories();
  res.json({ categories });
});
