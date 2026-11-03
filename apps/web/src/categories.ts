import { requireElement } from "./dom.js";

const chips = requireElement<HTMLElement>(document, ".chips");
const track = requireElement<HTMLElement>(document, ".chips__track");
const chipsClear = requireElement<HTMLElement>(document, ".chips__clear");
const chipTemplate = requireElement<HTMLTemplateElement>(document, "#chip");

let knownCategories = new Set<string>();

export function getKnownCategories(): ReadonlySet<string> {
  return knownCategories;
}

function chip(name: string): DocumentFragment {
  const node = chipTemplate.content.cloneNode(true) as DocumentFragment;
  const input = requireElement<HTMLInputElement>(node, ".chip__input");
  const label = requireElement<HTMLElement>(node, ".chip__label");
  input.value = name;
  label.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  return node;
}

export function selectedCategory(): string {
  const selected = chips.querySelector<HTMLInputElement>(
    'input[name="category"]:checked',
  );
  return selected ? selected.value : "";
}

export function setSelectedCategory(category: string): void {
  for (const input of chips.querySelectorAll<HTMLInputElement>(
    'input[name="category"]',
  )) {
    input.checked = category !== "" && input.value.toLowerCase() === category;
  }
}

export async function loadCategories(): Promise<void> {
  const response = await fetch("/products/categories");
  const data = (await response.json()) as { categories: string[] };
  knownCategories = new Set(
    data.categories.map((name) => name.trim().toLowerCase()),
  );
  const clear = requireElement<HTMLElement>(track, ".chips__clear");
  const fragment = document.createDocumentFragment();
  for (const name of data.categories) {
    fragment.append(chip(name));
  }
  clear.before(fragment);
}

export function bindCategories(onChange: () => void): void {
  chips.addEventListener("change", onChange);
  chipsClear.addEventListener("click", (event) => {
    event.preventDefault();
    const selected = chips.querySelector<HTMLInputElement>(
      'input[name="category"]:checked',
    );
    if (selected) selected.checked = false;
    onChange();
  });
}
