import { requireElement } from "./dom.js";
import { formatCurrency } from "./money.js";
import type { EnrichedProduct, Enrichment, ResultsViewData } from "./types.js";

const summary = requireElement<HTMLElement>(document, ".results__summary");
const pager = requireElement<HTMLElement>(document, ".pager");
const pagerRange = requireElement<HTMLElement>(document, ".pager__range");
const pagerPrev = requireElement<HTMLButtonElement>(document, ".pager__prev");
const pagerNext = requireElement<HTMLButtonElement>(document, ".pager__next");
const list = requireElement<HTMLElement>(document, ".result-list");
const skeleton = requireElement<HTMLTemplateElement>(document, "#skeleton");
const result = requireElement<HTMLTemplateElement>(document, "#result");
const searchEmpty = requireElement<HTMLTemplateElement>(
  document,
  "#search-empty",
);
const searchError = requireElement<HTMLTemplateElement>(
  document,
  "#search-error",
);
const enrichmentBanner = requireElement<HTMLTemplateElement>(
  document,
  "#enrichment-banner",
);
const status = requireElement<HTMLElement>(document, ".results__status");
const sortSelect = requireElement<HTMLSelectElement>(document, "#sort");
const searchInput = requireElement<HTMLInputElement>(document, "#q");

let retry = (): void => {};
let retryProduct = (_productId: number): void => {};
let onPageChange = (_page: number): void => {};
let setPageFromResults = (_page: number): void => {};
let lastPage = 1;

export function initResults(deps: { setPage: (page: number) => void }): void {
  setPageFromResults = deps.setPage;
}

function setSearchControlsDisabled(disabled: boolean): void {
  searchInput.disabled = disabled;
  sortSelect.disabled = disabled;
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[name="category"]',
  )) {
    input.disabled = disabled;
  }
  const clear = document.querySelector<HTMLButtonElement>(".chips__clear");
  if (clear) clear.disabled = disabled;
}

list.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest(".result__retry");
  if (!button || !(button instanceof HTMLButtonElement)) return;

  const rawId = button.dataset.productId;
  const productId = rawId ? Number.parseInt(rawId, 10) : NaN;
  if (Number.isFinite(productId) && productId > 0) {
    retryProduct(productId);
    return;
  }
  retry();
});

pagerPrev.addEventListener("click", () => onPageChange(lastPage - 1));
pagerNext.addEventListener("click", () => onPageChange(lastPage + 1));

function formatSummary(view: ResultsViewData): string {
  const { total, loadedCount } = view;
  let text = `${total} results`;
  if (total > loadedCount) {
    text += ` (showing first ${loadedCount} loaded in the browser)`;
  }
  return text;
}

function updatePager(data: ResultsViewData): void {
  const total = data.total ?? 0;
  const page = data.page ?? 1;
  const limit = data.limit ?? 10;
  lastPage = page;
  setPageFromResults(page);

  if (total > limit) {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    pager.hidden = false;
    pagerRange.textContent = `Showing ${start}–${end} of ${total}`;
    pagerPrev.disabled = page <= 1;
    pagerNext.disabled = page * limit >= total;
    return;
  }

  pager.hidden = true;
}

function renderEnrichmentBanner(
  enrichment: Enrichment,
  onRetry: () => void,
): void {
  if (enrichment !== "partial" && enrichment !== "failed") {
    status.replaceChildren();
    return;
  }

  const node = enrichmentBanner.content.cloneNode(true) as DocumentFragment;
  const text = requireElement<HTMLElement>(node, ".enrichment-banner__text");
  text.textContent =
    enrichment === "failed"
      ? "Prices could not be loaded for these results. Try again or refresh individual items."
      : "Some prices are still missing. Try again to load the rest.";

  requireElement<HTMLButtonElement>(
    node,
    ".enrichment-banner__retry",
  ).addEventListener("click", onRetry);
  status.replaceChildren(node);
}

export type ResultsHandlers = {
  onRetry?: () => void;
  onRetryProduct?: (productId: number) => void;
  onPageChange?: (page: number) => void;
};

export function show(
  state: "loading" | "error" | "results",
  data?: ResultsViewData | Record<string, unknown>,
  handlers: ResultsHandlers = {},
): void {
  retry = handlers.onRetry ?? (() => {});
  retryProduct = handlers.onRetryProduct ?? (() => retry());
  onPageChange = handlers.onPageChange ?? (() => {});

  if (state === "loading") {
    setSearchControlsDisabled(true);
    status.replaceChildren();
    summary.textContent = "Loading...";
    pager.hidden = true;
    list.setAttribute("aria-busy", "true");
    list.replaceChildren(skeleton.content.cloneNode(true));
    return;
  }

  setSearchControlsDisabled(false);
  list.removeAttribute("aria-busy");

  if (state === "error") {
    summary.textContent = "";
    pager.hidden = true;
    list.replaceChildren();

    const node = searchError.content.cloneNode(true) as DocumentFragment;
    requireElement<HTMLButtonElement>(node, ".button").addEventListener(
      "click",
      retry,
    );
    status.replaceChildren(node);
    return;
  }

  const view = data as ResultsViewData;
  summary.textContent = formatSummary(view);
  updatePager(view);

  if (view.total === 0) {
    list.replaceChildren(searchEmpty.content.cloneNode(true));
    status.replaceChildren();
    return;
  }

  list.replaceChildren(...view.products.map((product) => card(product)));
  renderEnrichmentBanner(view.enrichment, retry);
}

function card(product: EnrichedProduct): DocumentFragment {
  const node = result.content.cloneNode(true) as DocumentFragment;
  const offer = requireElement<HTMLElement>(node, ".result__offer");
  const price = requireElement<HTMLElement>(node, "[data-price]");
  const badge = requireElement<HTMLElement>(node, ".badge");
  const eta = requireElement<HTMLElement>(node, ".result__eta");
  const retryButton = requireElement<HTMLButtonElement>(node, ".result__retry");

  retryButton.dataset.productId = String(product.id);

  requireElement<HTMLElement>(node, ".result__category").textContent =
    product.category ?? "";
  requireElement<HTMLElement>(node, ".result__name").textContent =
    product.title;
  requireElement<HTMLElement>(node, ".result__vendor").textContent =
    product.brand ?? "";

  if (product.price == null || !product.availabilityStatus) {
    price.hidden = true;
    offer.hidden = false;
    eta.hidden = true;
    badge.hidden = true;

    return node;
  }

  price.textContent = formatCurrency(product.price);
  const availability = product.availabilityStatus.toLowerCase();

  if (availability === "in stock") {
    badge.className = "badge badge__in-stock";
    badge.textContent = "Available";
    requireElement<HTMLElement>(node, ".result__eta-text").textContent =
      product.shippingInformation ?? "";
  } else if (availability === "low stock") {
    badge.className = "badge badge__low-stock";
    badge.textContent = "Only a few left";
    eta.hidden = true;
  }

  return node;
}

export function showEmpty(): void {
  setSearchControlsDisabled(false);
  status.replaceChildren();
  summary.textContent = "";
  pager.hidden = true;
  list.replaceChildren();
  list.removeAttribute("aria-busy");
}
