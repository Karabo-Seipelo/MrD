const query = document.querySelector("#q");
const suggestList = document.querySelector("#suggest-list");
const searchField = document.querySelector(".search__field");

let suggestTimer = null;
let suggestAbort = null;
let lastSuggestion = "";
let onPick = () => {};

const suggestCache = new Map();
const SEARCH_DELAY_MS = 280;
const SUGGEST_MIN = 2;

export function hideSuggestions() {
  suggestList.hidden = true;
  suggestList.replaceChildren();
  query.setAttribute("aria-expanded", "false");
}

function renderSuggestion(items) {
  suggestList.replaceChildren();
  if (!items.length) {
    hideSuggestions();
    return;
  }

  for (const title of items) {
    const li = document.createElement("li");
    li.className = "suggest__item";
    li.setAttribute("role", "option");
    li.textContent = title;
    li.addEventListener("click", () => {
      query.value = title;
      hideSuggestions();
      onPick();
    });
    suggestList.append(li);
  }
  suggestList.hidden = false;
  query.setAttribute("aria-expanded", "true");
}

async function updateSuggestions() {
  const q = query.value.trim();
  if (q.length < SUGGEST_MIN) {
    hideSuggestions();
    lastSuggestion = "";
    return;
  }

  if (q === lastSuggestion) return;

  const cached = suggestCache.get(q);

  if (cached) {
    lastSuggestion = q;
    renderSuggestion(cached);
    return;
  }

  suggestAbort?.abort();
  suggestAbort = new AbortController();

  try {
    const params = new URLSearchParams({ q, limit: "8" });
    const response = await fetch(`/products/suggest?${params}`, {
      signal: suggestAbort.signal,
    });

    if (!response.ok) {
      hideSuggestions();
      return;
    }

    const data = await response.json();
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    suggestCache.set(q, suggestions);
    lastSuggestion = q;
    renderSuggestion(suggestions);
  } catch (error) {
    if (error.name === "AbortError") return;
    hideSuggestions();
  }
}

export function bindSuggestions({ onPick: pick }) {
  onPick = pick;

  query.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(updateSuggestions, SEARCH_DELAY_MS);
  });

  query.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSuggestions();
  });

  document.addEventListener("click", (event) => {
    if (!searchField.contains(event.target)) hideSuggestions();
  });
}
