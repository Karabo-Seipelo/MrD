import { selectedCategory, setSelectedCategory } from "./categories.js";

const query = document.querySelector("#q");
const sort = document.querySelector("#sort");

export const DEFAULT_LIMIT = 10;
export const FETCH_LIMIT = 40;

let page = 1;

export function getPage() {
  return page;
}

export function setPage(next) {
  page = Math.max(1, Math.floor(next));
}

export function resetPage() {
  page = 1;
}

export function getSort() {
  return sort.value === "desc" ? "desc" : "asc";
}

export function buildFetchParams() {
  const params = new URLSearchParams();
  const text = query.value.trim();
  const category = selectedCategory();

  if (text) params.set("q", text);
  if (category) params.set("category", category);
  params.set("limit", String(FETCH_LIMIT));

  return params;
}

export function writeUrl() {
  const params = new URLSearchParams();
  const text = query.value.trim();
  const category = selectedCategory();

  if (text) params.set("q", text);
  if (category) params.set("category", category);
  if (sort.value === "desc") params.set("sort", "desc");
  if (page > 1) params.set("page", String(page));

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

  const pageParam = Number(params.get("page"));
  page =
    Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
}
