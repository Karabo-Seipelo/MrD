import { selectedCategory, setSelectedCategory } from "./categories.js";

const query = document.querySelector("#q");
const sort = document.querySelector("#sort");

export function writeUrl() {
  const params = new URLSearchParams();
  const text = query.value.trim();
  const category = selectedCategory();

  if (text) params.set("q", text);
  if (category) params.set("category", category);
  if (sort.value === "desc") params.set("sort", "desc");

  const next = params.toString();
  const url = next ? `${location.pathname}?${next}` : location.pathname;
  const state = { searched: true };

  if (url === location.pathname + location.search) {
    if (!history.state?.searched) history.replaceState(state, "", url);
    return;
  }
  history.pushState(state, "", url);
}

export function applyFromLocation() {
  const params = new URLSearchParams(location.search);
  query.value = params.get("q") ?? "";
  sort.value = params.get("sort") === "desc" ? "desc" : "asc";
  setSelectedCategory((params.get("category") ?? "").trim().toLowerCase());
}
