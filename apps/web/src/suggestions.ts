import { requireElement } from "./dom.js";

const query = requireElement<HTMLInputElement>(document, "#q");
const suggestList = requireElement<HTMLElement>(document, "#suggest-list");
const searchField = requireElement<HTMLElement>(document, ".search__field");
const suggestItem = requireElement<HTMLTemplateElement>(
  document,
  "#suggest-item",
);

let suggestTimer: ReturnType<typeof setTimeout> | null = null;
let suggestAbort: AbortController | null = null;
let lastSuggestion = "";
let onPick = (): void => {};

const suggestCache = new Map<string, string[]>();
const SEARCH_DELAY_MS = 280;
const SUGGEST_MIN = 2;

export function hideSuggestions(): void {
  suggestList.hidden = true;
  suggestList.replaceChildren();
  query.setAttribute("aria-expanded", "false");
}

function renderSuggestion(items: string[]): void {
  if (!items.length) {
    hideSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const title of items) {
    const node = suggestItem.content.cloneNode(true) as DocumentFragment;
    const li = requireElement<HTMLElement>(node, ".suggest__item");
    li.textContent = title;
    fragment.append(node);
  }

  suggestList.replaceChildren(fragment);
  suggestList.hidden = false;
  query.setAttribute("aria-expanded", "true");
}

async function updateSuggestions(): Promise<void> {
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

    const data = (await response.json()) as { suggestions?: string[] };
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    suggestCache.set(q, suggestions);
    lastSuggestion = q;
    renderSuggestion(suggestions);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    hideSuggestions();
  }
}

export function bindSuggestions(options: { onPick: () => void }): void {
  onPick = options.onPick;

  suggestList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest(".suggest__item");
    if (!item) return;
    query.value = item.textContent ?? "";
    hideSuggestions();
    onPick();
  });

  query.addEventListener("input", () => {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => {
      void updateSuggestions();
    }, SEARCH_DELAY_MS);
  });

  query.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSuggestions();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!searchField.contains(target)) hideSuggestions();
  });
}
