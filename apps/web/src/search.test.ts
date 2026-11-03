import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSearch } from "./search.js";
import type { ProductsResponse } from "./types.js";
import type { UrlState } from "./url.js";

function product(id: number) {
  return {
    id,
    title: `P${id}`,
    description: "",
    category: "beauty",
    price: id,
    availabilityStatus: "In Stock",
  };
}

function stubUrl(overrides: Partial<UrlState> = {}): UrlState {
  let page = 1;
  const base: UrlState = {
    DEFAULT_LIMIT: 5,
    FETCH_LIMIT: 40,
    getPage: () => page,
    setPage: (next) => {
      page = Math.max(1, Math.floor(next));
    },
    resetPage: () => {
      page = 1;
    },
    getSort: () => "asc",
    getSearchParams: () => ({
      q: "cream",
      category: "",
      sort: "asc",
      page,
    }),
    buildFetchParams: () => new URLSearchParams("q=cream&limit=40"),
    writeUrl: vi.fn(),
    applyFromLocation: () => false,
    syncLocationFromState: vi.fn(),
  };
  return { ...base, ...overrides };
}

describe("createSearch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches products and renders results", async () => {
    const states: string[] = [];
    const body: ProductsResponse = {
      products: [product(1)],
      total: 1,
      query: "cream",
      enrichment: "ok",
      attempts: 1,
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const { search } = createSearch({
      show: (state) => states.push(state),
      hideSuggestions: () => {},
      url: stubUrl(),
    });

    await search({ record: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["loading", "results"]);
  });

  it("uses cache on second search with same key", async () => {
    const body: ProductsResponse = {
      products: [product(1)],
      total: 1,
      query: "cream",
      enrichment: "ok",
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const { search } = createSearch({
      show: () => {},
      hideSuggestions: () => {},
      url: stubUrl(),
    });

    await search({ record: false });
    await search({ record: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clamps page when total is smaller than URL page", async () => {
    const syncLocationFromState = vi.fn();
    let page = 10;
    const body: ProductsResponse = {
      products: [product(1), product(2), product(3)],
      total: 3,
      query: "cream",
      enrichment: "ok",
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    let lastView: { page: number } | undefined;
    const { search } = createSearch({
      show: (state, data) => {
        if (state === "results" && data && "page" in data) {
          lastView = data as { page: number };
        }
      },
      hideSuggestions: () => {},
      url: stubUrl({
        getPage: () => page,
        setPage: (next) => {
          page = Math.max(1, Math.floor(next));
        },
        syncLocationFromState,
      }),
    });

    await search({ record: false });

    expect(page).toBe(1);
    expect(lastView?.page).toBe(1);
    expect(syncLocationFromState).toHaveBeenCalled();
  });
});
