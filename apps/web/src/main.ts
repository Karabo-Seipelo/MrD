import {
  bindCategories,
  loadCategories,
  selectedCategory,
  setSelectedCategory,
} from "./categories.js";
import { requireElement } from "./dom.js";
import { initResults, show, showEmpty } from "./results.js";
import { abortSearch, createSearch } from "./search.js";
import { bindSuggestions, hideSuggestions } from "./suggestions.js";
import { createUrlState } from "./url.js";

const form = requireElement<HTMLFormElement>(document, ".search");
const sort = requireElement<HTMLSelectElement>(document, "#sort");
const query = requireElement<HTMLInputElement>(document, "#q");

const url = createUrlState(query, sort, {
  selectedCategory,
  setSelectedCategory,
});

function normalizeLocationFromUrl(): void {
  const changed = url.applyFromLocation();
  if (changed) url.syncLocationFromState();
}

initResults({ setPage: url.setPage });

const { search, applyView, syncView, retryProductOffer } = createSearch({
  show: (state, data) =>
    show(state, data, {
      onRetry: () => search({ refetch: true }),
      onRetryProduct: (productId) => retryProductOffer(productId),
      onPageChange: (page) => {
        url.setPage(page);
        url.writeUrl();
        applyView();
      },
    }),
  hideSuggestions,
  url,
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void search({ resetPage: true });
});

sort.addEventListener("change", () => {
  url.resetPage();
  url.writeUrl();
  applyView();
});

bindCategories(() => {
  void search({ resetPage: true });
});
bindSuggestions({ onPick: () => search({ resetPage: true }) });

window.addEventListener("online", () => {
  if (document.querySelector(".results__status .search-error")) {
    void search();
  }
});

window.addEventListener("popstate", () => {
  normalizeLocationFromUrl();
  if (
    location.search ||
    (history.state as { searched?: boolean } | null)?.searched
  ) {
    syncView({ record: false });
  } else {
    abortSearch();
    hideSuggestions();
    showEmpty();
  }
});

try {
  await loadCategories();
} catch {
  console.error("Failed to load categories");
}

normalizeLocationFromUrl();

if (location.search) void search({ record: false });
