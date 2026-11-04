import { sortByPrice, type Product } from "./search.js";

export type Offer = {
  id: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
};

export type EnrichedProduct = Product & {
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
};

export type Enrichment = "ok" | "partial" | "failed";

export type EnrichOptions = {
  maxAttempts: number;
  maxMs: number;
};

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const DEFAULT_ENRICH_OPTIONS: EnrichOptions = {
  maxAttempts: readIntEnv("ENRICH_MAX_ATTEMPTS", 3),
  maxMs: readIntEnv("ENRICH_MAX_MS", 2500),
};

export function isEnriched(product: EnrichedProduct): boolean {
  return product.price != null && Boolean(product.availabilityStatus);
}

export function enrichmentStatus(products: EnrichedProduct[]): Enrichment {
  if (products.length === 0) return "ok";
  const enriched = products.filter(isEnriched).length;
  if (enriched === products.length) return "ok";
  if (enriched === 0) return "failed";
  return "partial";
}

function joinProducts(
  matches: Product[],
  byId: Map<number, Offer>,
  sort: string,
): EnrichedProduct[] {
  return sortByPrice(
    matches.map((product) => ({
      ...product,
      ...byId.get(product.id),
    })),
    sort,
  );
}

function missingIds(matches: Product[], byId: Map<number, Offer>): number[] {
  return matches
    .filter((product) => !isEnriched({ ...product, ...byId.get(product.id) }))
    .map((product) => product.id);
}

export async function enrichProductsWithRetry(
  matches: Product[],
  sort: string,
  fetchOffers: (ids: number[]) => Promise<Offer[]>,
  options?: Partial<EnrichOptions>,
): Promise<{
  products: EnrichedProduct[];
  enrichment: Enrichment;
  attempts: number;
}> {
  if (matches.length === 0) {
    return { products: [], enrichment: "ok", attempts: 0 };
  }

  const { maxAttempts, maxMs } = { ...DEFAULT_ENRICH_OPTIONS, ...options };
  const deadline = Date.now() + maxMs;
  const byId = new Map<number, Offer>();
  let attempts = 0;

  while (attempts < maxAttempts && Date.now() < deadline) {
    attempts++;

    const idsToFetch =
      byId.size === 0
        ? matches.map((product) => product.id)
        : missingIds(matches, byId);

    if (byId.size > 0 && idsToFetch.length === 0) {
      break;
    }

    try {
      const offers = await fetchOffers(idsToFetch);
      for (const offer of offers) {
        byId.set(offer.id, offer);
      }
    } catch {
      continue;
    }

    if (missingIds(matches, byId).length === 0) {
      break;
    }
  }

  const products = joinProducts(matches, byId, sort);

  let enrichment: Enrichment;
  if (byId.size === 0) {
    enrichment = "failed";
  } else {
    enrichment = enrichmentStatus(products);
  }

  return { products, enrichment, attempts };
}
