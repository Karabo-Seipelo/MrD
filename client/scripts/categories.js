const chips = document.querySelector(".chips");
const track = document.querySelector(".chips__track");
const chipsClear = document.querySelector(".chips__clear");

function chip(name) {
  const label = document.createElement("label");
  label.className = "chip";

  const input = document.createElement("input");
  input.className = "chip__input";
  input.type = "radio";
  input.name = "category";
  input.value = name;

  const text = document.createElement("span");
  text.className = "chip__label";
  text.textContent = name.charAt(0).toUpperCase() + name.slice(1);

  label.append(input, text);
  return label;
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
  for (const name of data.categories) {
    track.insertBefore(chip(name), clear);
  }
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
