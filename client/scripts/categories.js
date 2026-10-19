const chips = document.querySelector(".chips");
const track = document.querySelector(".chips__track");
const chipsClear = document.querySelector(".chips__clear");
const chipTemplate = document.querySelector("#chip");

function chip(name) {
  const node = chipTemplate.content.cloneNode(true);
  const input = node.querySelector(".chip__input");
  const label = node.querySelector(".chip__label");
  input.value = name;
  label.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  return node;
}

export function selectedCategory() {
  const selected = chips.querySelector('input[name="category"]:checked');
  return selected ? selected.value : "";
}

export function setSelectedCategory(category) {
  for (const input of chips.querySelectorAll('input[name="category"]')) {
    input.checked = category !== "" && input.value.toLowerCase() === category;
  }
}

export function categoryForRequest() {
  const selected = selectedCategory();
  if (selected) return selected;
  return (new URLSearchParams(location.search).get("category") ?? "").trim();
}

export async function loadCategories() {
  const response = await fetch("/products/categories");
  const data = await response.json();
  const clear = track.querySelector(".chips__clear");
  const fragment = document.createDocumentFragment();
  for (const name of data.categories) {
    fragment.append(chip(name));
  }
  clear.before(fragment);
}

export function bindCategories(onChange) {
  chips.addEventListener("change", onChange);
  chipsClear.addEventListener("click", (event) => {
    event.preventDefault();
    const selected = chips.querySelector('input[name="category"]:checked');
    if (selected) selected.checked = false;
    onChange();
  });
}
