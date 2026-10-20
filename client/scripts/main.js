import {
  loadCategories,
  categoryForRequest,
  bindCategories,
} from "./categories.js";
import { hideSuggestions, bindSuggestions } from "./suggestions.js";
import { show, showEmpty } from "./results.js";
import { writeUrl, applyFromLocation } from "./url.js";
import { createSearch, abortSearch } from "./search.js";

const form = document.querySelector(".search");
const query = document.querySelector("#q");
const sort = document.querySelector("#sort");

const search = createSearch({
  getParams: () =>
    new URLSearchParams({
      q: query.value.trim(),
      sort: sort.value,
      category: categoryForRequest(),
    }),
  show: (state, data) => show(state, data, () => search()),
  hideSuggestions,
  writeUrl,
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  search();
});

sort.addEventListener("change", () => search());

bindCategories(() => search());
bindSuggestions({ onPick: () => search() });

window.addEventListener("online", () => {
  if (document.querySelector(".results__status .search-error")) search();
});

window.addEventListener("popstate", (event) => {
  applyFromLocation();
  if (location.search || event.state?.searched) {
    search({ record: false });
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
