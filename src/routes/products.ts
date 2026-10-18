import { Router } from "express";
import { fetchOffers, listCategories, catalog } from "../upstream.js";
import { queryProducts, sortByPrice,suggestProducts, type Product } from "../search.js";

export const productsRouter = Router();

let searchCount = 0;

function withoutOffer(product: Product): Product {
  const item = {...product };
  delete item.price;
  delete item.availabilityStatus;
  delete item.shippingInformation;

  return item;
}

productsRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

productsRouter.get("/products", async (req, res) => {
  const started = performance.now();
  const request = ++searchCount;
  const q = String(req.query.q ?? "");
  const category = String(req.query.category ?? "");
  const sort = String(req.query.sort ?? "asc");
  const matches = queryProducts(catalog.products as Product[], q, category);
  let enrichment = "ok";

  try {
    if (matches.length === 0) {
      res.json({
        products: [],
        total: 0,
        query: q,
        enrichment,
      });
      return;
    }

    const offers = await fetchOffers(matches.map((product) => product.id));
    const byId = new Map(offers.map((offer) => [offer.id, offer]));
    const products = sortByPrice(
      matches.map((product) => ({
        ...withoutOffer(product),
        ...byId.get(product.id)
      })),
      sort
    );

    res.json({
      products,
      total: products.length,
      query: q,
      enrichment
    })
  } catch {
    enrichment = "failed";
    res.json({
      products: matches.map(withoutOffer),
      total: matches.length,
      query: q,
      enrichment
    })
  } finally {
    const ms = Math.round(performance.now() - started);
    console.log(`search #${request} 200 ${ms}ms enrichment=${enrichment} q=${JSON.stringify(q)}`)
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