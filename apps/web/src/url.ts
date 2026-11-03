import { getKnownCategories } from "./categories.js";
import {
  parseSearchParams,
  serializeSearchParams,
  type SearchParams,
} from "./searchParams.js";

export const DEFAULT_LIMIT = 5;
export const FETCH_LIMIT = 40;

export type UrlCategoryApi = {
  selectedCategory: () => string;
  setSelectedCategory: (category: string) => void;
};

export type WriteUrlOptions = {
  replace?: boolean;
};

export type UrlState = {
  DEFAULT_LIMIT: typeof DEFAULT_LIMIT;
  FETCH_LIMIT: typeof FETCH_LIMIT;
  getPage: () => number;
  setPage: (next: number) => void;
  resetPage: () => void;
  getSort: () => "asc" | "desc";
  getSearchParams: () => SearchParams;
  buildFetchParams: () => URLSearchParams;
  writeUrl: (options?: WriteUrlOptions) => void;
  applyFromLocation: () => boolean;
  syncLocationFromState: () => boolean;
};

export function createUrlState(
  query: HTMLInputElement,
  sort: HTMLSelectElement,
  categoryApi: UrlCategoryApi,
): UrlState {
  let page = 1;

  function readFormParams(): SearchParams {
    return {
      q: query.value.trim(),
      category: categoryApi.selectedCategory().trim().toLowerCase(),
      sort: sort.value === "desc" ? "desc" : "asc",
      page,
    };
  }

  function applyParams(params: SearchParams): void {
    query.value = params.q;
    sort.value = params.sort === "desc" ? "desc" : "asc";
    categoryApi.setSelectedCategory(params.category);
    page = params.page;
  }

  function historyUrl(params: SearchParams): string {
    const qs = serializeSearchParams(params);
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }

  function commitUrl(params: SearchParams, replace: boolean): void {
    const url = historyUrl(params);
    const state = { searched: true };
    const current = location.pathname + location.search;

    if (url === current) {
      if (!(history.state as { searched?: boolean } | null)?.searched) {
        history.replaceState(state, "", url);
      }
      return;
    }

    if (replace) {
      history.replaceState(state, "", url);
      return;
    }

    history.pushState(state, "", url);
  }

  return {
    DEFAULT_LIMIT,
    FETCH_LIMIT,
    getPage() {
      return page;
    },
    setPage(next: number) {
      page = Math.max(1, Math.floor(next));
    },
    resetPage() {
      page = 1;
    },
    getSort() {
      return sort.value === "desc" ? "desc" : "asc";
    },
    getSearchParams() {
      return readFormParams();
    },
    buildFetchParams() {
      const params = new URLSearchParams();
      const { q, category } = readFormParams();

      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("limit", String(FETCH_LIMIT));

      return params;
    },
    writeUrl(options = {}) {
      commitUrl(readFormParams(), options.replace ?? false);
    },
    applyFromLocation() {
      const { params, changed } = parseSearchParams(location.search, {
        knownCategories: getKnownCategories(),
      });
      applyParams(params);
      return changed;
    },
    syncLocationFromState() {
      const params = readFormParams();
      const canonical = serializeSearchParams(params);
      const current = location.search.startsWith("?")
        ? location.search.slice(1)
        : location.search;
      if (canonical === current) return false;
      commitUrl(params, true);
      return true;
    },
  };
}
