import { enrichmentStatus } from "./enrichment.js";
import { mergeProductOffers } from "./mergeOffers.js";
import { paginate, sortByPrice } from "./sort.js";
import type {
  EnrichedProduct,
  Enrichment,
  ResultsViewData,
  SearchSession,
  SortOrder,
} from "./types.js";

export const SEARCH_CACHE_MAX = 20;

export function createSearchCache(max = SEARCH_CACHE_MAX) {
  const map = new Map<string, SearchSession>();

  return {
    get(key: string): SearchSession | undefined {
      const value = map.get(key);
      if (value === undefined) return undefined;
      map.delete(key);
      map.set(key, value);
      return value;
    },
    remember(key: string, session: SearchSession): void {
      map.delete(key);
      map.set(key, session);
      if (map.size > max) {
        const first = map.keys().next().value;
        if (first !== undefined) map.delete(first);
      }
    },
    size(): number {
      return map.size;
    },
  };
}

export function mergeAfterProductsFetch(
  previous: EnrichedProduct[] | null,
  incoming: EnrichedProduct[],
  refetch: boolean,
): { products: EnrichedProduct[]; enrichment: Enrichment } {
  const products =
    refetch && previous ? mergeProductOffers(previous, incoming) : incoming;
  return { products, enrichment: enrichmentStatus(products) };
}

export function mergeAfterOffersFetch(
  sessionProducts: EnrichedProduct[],
  offerProducts: EnrichedProduct[],
): { products: EnrichedProduct[]; enrichment: Enrichment } {
  const byId = new Map(offerProducts.map((product) => [product.id, product]));
  const products = sessionProducts.map((product) => {
    const patch = byId.get(product.id);
    if (!patch) return product;
    return mergeProductOffers([product], [patch])[0];
  });
  return { products, enrichment: enrichmentStatus(products) };
}

export function paginateView(
  session: SearchSession,
  sort: SortOrder,
  page: number,
  limit: number,
): ResultsViewData {
  const sorted = sortByPrice(session.products, sort);
  const pageProducts = paginate(sorted, page, limit);
  return {
    products: pageProducts,
    total: session.total,
    loadedCount: session.products.length,
    query: session.query,
    page,
    limit,
    enrichment: session.enrichment,
  };
}
