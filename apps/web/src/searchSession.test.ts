import {
  createSearchCache,
  mergeAfterOffersFetch,
  mergeAfterProductsFetch,
  SEARCH_CACHE_MAX,
} from "./searchSession.js";
import type { EnrichedProduct, SearchSession } from "./types.js";

const enriched = (id: number, price?: number): EnrichedProduct => ({
  id,
  title: `P${id}`,
  description: "",
  category: "beauty",
  ...(price != null
    ? {
        price,
        availabilityStatus: "In Stock",
        shippingInformation: "25 min",
      }
    : {}),
});

describe("createSearchCache", () => {
  it("evicts oldest entry when over max", () => {
    const cache = createSearchCache(2);
    const session = (key: string): SearchSession => ({
      products: [],
      total: 0,
      query: key,
      enrichment: "ok",
    });

    cache.remember("a", session("a"));
    cache.remember("b", session("b"));
    cache.remember("c", session("c"));

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
    expect(cache.size()).toBe(2);
  });

  it("refreshes LRU order on touch", () => {
    const cache = createSearchCache(2);
    const session = (key: string): SearchSession => ({
      products: [],
      total: 0,
      query: key,
      enrichment: "ok",
    });

    cache.remember("a", session("a"));
    cache.remember("b", session("b"));
    cache.get("a");
    cache.remember("c", session("c"));

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
  });
});

describe("mergeAfterProductsFetch", () => {
  it("merges on refetch and can reach ok", () => {
    const previous = [enriched(1, 10)];
    const incoming = [enriched(1)];

    const result = mergeAfterProductsFetch(previous, incoming, true);
    expect(result.products[0].price).toBe(10);
    expect(result.enrichment).toBe("ok");
  });

  it("does not merge when not refetching", () => {
    const previous = [enriched(1, 10)];
    const incoming = [enriched(1)];

    const result = mergeAfterProductsFetch(previous, incoming, false);
    expect(result.products[0].price).toBeUndefined();
    expect(result.enrichment).toBe("failed");
  });
});

describe("mergeAfterOffersFetch", () => {
  it("patches session products by id", () => {
    const sessionProducts = [enriched(1), enriched(2)];
    const offerProducts = [enriched(2, 99)];

    const result = mergeAfterOffersFetch(sessionProducts, offerProducts);
    expect(result.products[1].price).toBe(99);
    expect(result.enrichment).toBe("partial");
  });
});

describe("SEARCH_CACHE_MAX", () => {
  it("defaults to 20", () => {
    expect(SEARCH_CACHE_MAX).toBe(20);
  });
});
