import { loadCategories, bindCategories } from "./categories.js";
import { hideSuggestions, bindSuggestions } from "./suggestions.js";
import { show, showEmpty } from "./results.js";
import { applyFromLocation, resetPage, setPage, writeUrl } from "./url.js";
import { createSearch, abortSearch } from "./search.js";

const form = document.querySelector(".search");
const sort = document.querySelector("#sort");

const { search, applyView, syncView } = createSearch({
  show: (state, data) =>
    show(state, data, {
      onRetry: () => search({ refetch: true }),
      onPageChange: (page) => {
        setPage(page);
        writeUrl();
        applyView();
      },
    }),
  hideSuggestions,
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  search({ resetPage: true });
});

sort.addEventListener("change", () => {
  resetPage();
  writeUrl();
  applyView();
});

bindCategories(() => search({ resetPage: true }));
bindSuggestions({ onPick: () => search({ resetPage: true }) });

window.addEventListener("online", () => {
  if (document.querySelector(".results__status .search-error")) search();
});

window.addEventListener("popstate", (event) => {
  applyFromLocation();
  if (location.search || event.state?.searched) {
    syncView({ record: false });
  } else {
    abortSearch();
    hideSuggestions();
    showEmpty();
  }
});

applyFromLocation();

try {
  await loadCategories();
} catch {
  console.error("Failed to load categories");
}

applyFromLocation();

if (location.search) search({ record: false });
