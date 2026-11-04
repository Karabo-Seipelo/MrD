import { maxPageForTotal } from "./searchParams.js";
import {
  createSearchCache,
  mergeAfterOffersFetch,
  mergeAfterProductsFetch,
  paginateView,
} from "./searchSession.js";
import type {
  OffersResponse,
  ProductsResponse,
  ResultsViewData,
  SearchSession,
  ShowState,
} from "./types.js";
import type { UrlState } from "./url.js";

type RenderResults = (
  state: ShowState,
  data?: ResultsViewData | Record<string, unknown>,
) => void;

export type CreateSearchOptions = {
  show: RenderResults;
  hideSuggestions: () => void;
  url: UrlState;
};

let activeSearchAbort: AbortController | null = null;

export function abortSearch(): void {
  activeSearchAbort?.abort();
}

export function createSearch({
  show,
  hideSuggestions,
  url,
}: CreateSearchOptions) {
  const searchCache = createSearchCache();
  let current: AbortController | null = null;
  let session: SearchSession | null = null;
  let sessionKey: string | null = null;
  let renderResults: RenderResults | null = null;

  function fetchKey(): string {
    return url.buildFetchParams().toString();
  }

  function clampPageToSession(): void {
    if (!session) return;
    const maxPage = maxPageForTotal(session.total, url.DEFAULT_LIMIT);
    if (url.getPage() > maxPage) {
      url.setPage(maxPage);
      url.syncLocationFromState();
    }
  }

  function applyView(): void {
    if (!session || !renderResults) return;

    clampPageToSession();

    const view = paginateView(
      session,
      url.getSort(),
      url.getPage(),
      url.DEFAULT_LIMIT,
    );
    renderResults("results", view);
  }

  renderResults = show;

  async function search({
    record = true,
    resetPage: shouldReset = false,
    page: nextPage,
    refetch = false,
  }: {
    record?: boolean;
    resetPage?: boolean;
    page?: number;
    refetch?: boolean;
  } = {}): Promise<void> {
    hideSuggestions();

    if (shouldReset) url.resetPage();
    if (nextPage != null) url.setPage(nextPage);
    if (record) url.writeUrl();

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
    activeSearchAbort = current;

    const params = url.buildFetchParams();
    show("loading");

    const started = performance.now();

    try {
      const response = await fetch(`/products?${params}`, {
        signal: current.signal,
      });
      const data = (await response.json()) as ProductsResponse;

      if (!response.ok) {
        show("error", data as unknown as Record<string, unknown>);
        return;
      }

      const previousProducts =
        refetch && session && sessionKey === key ? session.products : null;
      const { products, enrichment } = mergeAfterProductsFetch(
        previousProducts,
        data.products,
        refetch,
      );

      session = {
        products,
        total: data.total,
        query: data.query,
        enrichment,
      };
      sessionKey = key;

      if (enrichment === "ok") searchCache.remember(key, session);

      applyView();
      const ms = Math.round(performance.now() - started);
      console.log(`search ${response.status} ${ms}ms`, params.toString());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      show("error", { error: "Failed to load products" });
      console.log(`search failed ${Math.round(performance.now() - started)}ms`);
    }
  }

  function syncView({ record = false }: { record?: boolean } = {}): void {
    const key = fetchKey();
    if (session && sessionKey === key) {
      applyView();
      return;
    }
    void search({ record });
  }

  async function retryProductOffer(productId: number): Promise<void> {
    if (!session || !renderResults) return;

    try {
      const response = await fetch(
        `/offers?ids=${encodeURIComponent(String(productId))}`,
      );
      const data = (await response.json()) as OffersResponse;
      if (!response.ok) return;

      const { products, enrichment } = mergeAfterOffersFetch(
        session.products,
        data.products,
      );

      session = {
        ...session,
        products,
        enrichment,
      };

      if (session.enrichment === "ok" && sessionKey) {
        searchCache.remember(sessionKey, session);
      }

      applyView();
    } catch {
      /* keep current view */
    }
  }

  return { search, applyView, syncView, retryProductOffer };
}
