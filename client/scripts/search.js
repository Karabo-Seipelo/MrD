import { enrichmentStatus } from "./enrichment.js";
import { mergeProductOffers } from "./mergeOffers.js";
import { paginate, sortByPrice } from "./sort.js";
import {
  buildFetchParams,
  DEFAULT_LIMIT,
  getPage,
  getSort,
  resetPage,
  setPage,
  writeUrl,
} from "./url.js";

const searchCache = new Map();
const SEARCH_CACHE_MAX = 20;
let current = null;
let session = null;
let sessionKey = null;
let renderResults = null;

function rememberSearch(key, data) {
  searchCache.delete(key);
  searchCache.set(key, data);

  if (searchCache.size > SEARCH_CACHE_MAX) {
    searchCache.delete(searchCache.keys().next().value);
  }
}

function fetchKey() {
  return buildFetchParams().toString();
}

function applyView() {
  if (!session || !renderResults) return;

  const sorted = sortByPrice(session.products, getSort());
  const page = getPage();
  const pageProducts = paginate(sorted, page, DEFAULT_LIMIT);

  renderResults("results", {
    products: pageProducts,
    total: session.total,
    query: session.query,
    page,
    limit: DEFAULT_LIMIT,
    enrichment: session.enrichment,
  });
}

export function createSearch({ show, hideSuggestions }) {
  renderResults = show;

  async function search({
    record = true,
    resetPage: shouldReset = false,
    page: nextPage,
    refetch = false,
  } = {}) {
    hideSuggestions();

    if (shouldReset) resetPage();
    if (nextPage != null) setPage(nextPage);
    if (record) writeUrl();

    const key = fetchKey();

    if (!refetch && session && sessionKey === key) {
      applyView();
      return;
    }

    const cached = searchCache.get(key);
    if (!refetch && cached) {
      session = cached;
      sessionKey = key;
      applyView();
      console.log(`search cache hit`, key);
      return;
    }

    current?.abort();
    current = new AbortController();

    const params = buildFetchParams();
    show("loading");

    const started = performance.now();

    try {
      const response = await fetch(`/products?${params}`, {
        signal: current.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        show("error", data);
        return;
      }

      const previousProducts =
        refetch && session && sessionKey === key ? session.products : null;
      const products = previousProducts
        ? mergeProductOffers(previousProducts, data.products)
        : data.products;

      const enrichment = enrichmentStatus(products);
      session = {
        products,
        total: data.total,
        query: data.query,
        enrichment,
      };
      sessionKey = key;

      if (enrichment === "ok") rememberSearch(key, session);

      applyView();
      const ms = Math.round(performance.now() - started);
      console.log(`search ${response.status} ${ms}ms`, params.toString());
    } catch (error) {
      if (error.name === "AbortError") return;
      show("error", { error: "Failed to load products" });
      console.log(`search failed ${Math.round(performance.now() - started)}ms`);
    }
  }

  function syncView({ record = false } = {}) {
    const key = fetchKey();
    if (session && sessionKey === key) {
      applyView();
      return;
    }
    return search({ record });
  }

  async function retryProductOffer(productId) {
    if (!session || !renderResults) return;

    try {
      const response = await fetch(
        `/offers?ids=${encodeURIComponent(String(productId))}`,
      );
      const data = await response.json();
      if (!response.ok) return;

      const byId = new Map(
        data.products.map((product) => [product.id, product]),
      );
      const products = session.products.map((product) => {
        const patch = byId.get(product.id);
        if (!patch) return product;
        return mergeProductOffers([product], [patch])[0];
      });

      session = {
        ...session,
        products,
        enrichment: enrichmentStatus(products),
      };

      if (session.enrichment === "ok" && sessionKey) {
        rememberSearch(sessionKey, session);
      }

      applyView();
    } catch {
      /* keep current view */
    }
  }

  return { search, applyView, syncView, retryProductOffer };
}

export function abortSearch() {
  current?.abort();
}
