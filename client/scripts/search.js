const searchCache = new Map();
const SEARCH_CACHE_MAX = 20;
let current = null;

function rememberSearch(key, data) {
  searchCache.delete(key);
  searchCache.set(key, data);

  if (searchCache.size > SEARCH_CACHE_MAX) {
    searchCache.delete(searchCache.keys().next().value);
  }
}

export function createSearch({ getParams, show, hideSuggestions, writeUrl }) {
  return async function search({ record = true } = {}) {
    hideSuggestions();

    if (record) writeUrl();
    current?.abort();
    current = new AbortController();

    const params = getParams();
    const key = params.toString();
    const cached = searchCache.get(key);

    if (cached) {
      show("results", cached);
      return;
    }

    show("loading");

    try {
      const response = await fetch(`/products?${params}`, {
        signal: current.signal,
      });
      const data = await response.json();
      show(response.ok ? "results" : "error", data);

      if (response.ok && data.enrichment !== "failed")
        rememberSearch(key, data);
    } catch (error) {
      if (error.name === "AbortError") return;
      show("error", { error: "Failed to load products" });
    }
  };
}

export function abortSearch() {
  current?.abort();
}
