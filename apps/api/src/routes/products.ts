import {
  fetchOffersByIds,
  getCatalogProductsByIds,
  listCategories,
  searchProducts,
  suggestProductTitles,
} from "@mrd/db";
import type { Response } from "express";
import { Router } from "express";
import {
  enrichmentStatus,
  type Enrichment,
  type EnrichedProduct,
} from "../enrich.js";
import {
  idsEligibleForOffers,
  readOffersOmitIds,
  readOffersUpstreamMode,
  resolveOffersRouteAttempts,
  resolveOffersRouteEnrichment,
} from "../offersUpstream.js";
import { mergeOffersIntoProducts } from "../mergeOffersIntoProducts.js";
import { parsePagination } from "../search.js";

export type { EnrichedProduct, Enrichment } from "../enrich.js";
export { isEnriched, enrichmentStatus } from "../enrich.js";

export const productsRouter = Router();

let searchCount = 0;

function setProductsCacheControl(res: Response, enrichment: Enrichment) {
  if (enrichment !== "ok") {
    res.set("Cache-Control", "no-store");
  }
}

/** Search uses one SQL round trip when there are matches (no enrichProductsWithRetry). */
function searchEnrichmentAttempts(total: number): number {
  return total > 0 ? 1 : 0;
}

type OffersResponseBody = {
  products: EnrichedProduct[];
  enrichment: Enrichment;
  attempts: number;
};

function buildOffersResponse(
  products: EnrichedProduct[],
  enrichment: Enrichment,
  attempts: number,
): OffersResponseBody {
  return { products, enrichment, attempts };
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
  const { page, limit } = parsePagination(req.query.page, req.query.limit);
  const offersMode = readOffersUpstreamMode();
  const omitIds = readOffersOmitIds();

  try {
    const { products, total } = await searchProducts({
      q,
      category,
      sort,
      page,
      limit,
      offersMode,
      omitIds,
    });

    let enrichment: Enrichment = "ok";
    let attempts = 0;

    if (total === 0) {
      res.json({
        products: [],
        total: 0,
        page,
        limit,
        query: q,
        enrichment,
        attempts,
      });
    } else {
      enrichment =
        offersMode === "down" ? "failed" : enrichmentStatus(products);
      attempts = searchEnrichmentAttempts(total);
      setProductsCacheControl(res, enrichment);

      res.json({
        products,
        total,
        page,
        limit,
        query: q,
        enrichment,
        attempts,
      });
    }

    const ms = Math.round(performance.now() - started);
    console.log(
      `search #${request} 200 ${ms}ms enrichment=${enrichment} attempts=${attempts} q=${JSON.stringify(q)}`,
    );
  } catch (error) {
    const ms = Math.round(performance.now() - started);
    console.log(`search #${request} 500 ${ms}ms q=${JSON.stringify(q)}`);
    res.status(500).json({
      error: error instanceof Error ? error.message : "search failed",
    });
  }
});

function parseOfferIds(raw: unknown): number[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  return [
    ...new Set(
      text
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

productsRouter.get("/offers", async (req, res) => {
  const ids = parseOfferIds(req.query.ids);
  const offersMode = readOffersUpstreamMode();
  const omitIds = readOffersOmitIds();

  if (ids.length === 0) {
    res.status(400).json({ error: "ids query parameter is required" });
    return;
  }

  try {
    const products = await getCatalogProductsByIds(ids);
    if (products.length === 0) {
      res.json(buildOffersResponse([], "ok", 0));
      return;
    }

    const eligible = idsEligibleForOffers(
      products.map((product) => product.id),
      offersMode,
      omitIds,
    );
    const offers = eligible.length > 0 ? await fetchOffersByIds(eligible) : [];
    const merged = mergeOffersIntoProducts(products, offers);
    const enrichment = resolveOffersRouteEnrichment(
      offersMode,
      merged,
      eligible.length,
    );
    const attempts = resolveOffersRouteAttempts(
      offersMode,
      products.length,
      eligible.length,
    );

    setProductsCacheControl(res, enrichment);

    res.json(buildOffersResponse(merged, enrichment, attempts));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "offers failed",
    });
  }
});

productsRouter.get("/products/categories", async (_req, res) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "categories failed",
    });
  }
});

productsRouter.get("/products/suggest", async (req, res) => {
  const q = String(req.query.q ?? "");
  const limit = Math.min(Number(req.query.limit) || 8, 20);

  try {
    const suggestions = await suggestProductTitles(q, limit);
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "suggest failed",
    });
  }
});
