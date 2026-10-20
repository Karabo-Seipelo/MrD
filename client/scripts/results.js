import { formatCurrency } from "./money.js";

const summary = document.querySelector(".results__summary");
const list = document.querySelector(".result-list");
const skeleton = document.querySelector("#skeleton");
const result = document.querySelector("#result");
const searchError = document.querySelector("#search-error");
const status = document.querySelector(".results__status");

let retry = () => {};

list.addEventListener("click", (event) => {
  if (event.target.closest(".result__retry")) retry();
});

export function show(state, data, onRetry) {
  retry = onRetry;

  if (state === "loading") {
    status.replaceChildren();
    summary.textContent = "Loading...";
    list.setAttribute("aria-busy", true);
    list.replaceChildren(skeleton.content.cloneNode(true));
    return;
  }

  list.removeAttribute("aria-busy");

  if (state === "error") {
    summary.textContent = "";
    list.replaceChildren();

    const node = searchError.content.cloneNode(true);
    node.querySelector(".button").addEventListener("click", onRetry);
    status.replaceChildren(node);
    return;
  }

  summary.textContent = `${data.total} results`;
  list.replaceChildren(
    ...data.products.map((product) => card(product, onRetry)),
  );
  status.replaceChildren();
}

function card(product, onRetry) {
  const node = result.content.cloneNode(true);
  const offer = node.querySelector(".result__offer");
  const price = node.querySelector("[data-price]")
  const badge = node.querySelector(".badge");
  const eta= node.querySelector(".result__eta");

  node.querySelector(".result__category").textContent = product.category ?? "";
  node.querySelector(".result__name").textContent = product.title;
  node.querySelector(".result__vendor").textContent = product.brand ?? "";

  if (product.price == null || !product.availabilityStatus) {
    price.hidden = true;
    offer.hidden = false;
    eta.hidden = true;
    badge.hidden = true;

    // offer.querySelector(".result__retry").addEventListener("click", () => onRetry());

    return node;
  }

  price.textContent = formatCurrency(product.price);
  const availability = product.availabilityStatus.toLowerCase();

  if (availability === "in stock") {
    badge.className = "badge badge__in-stock";
    badge.textContent = "Available";
    node.querySelector(".result__eta-text").textContent = product.shippingInformation;
  } else if (availability === "low stock") {
    badge.className = "badge badge__low-stock";
    badge.textContent = "Only a few left";
    eta.hidden = true;
  }

  return node;
}

export function showEmpty() {
  status.replaceChildren();
  summary.textContent = "";
  list.replaceChildren();
  list.removeAttribute("aria-busy");
}
