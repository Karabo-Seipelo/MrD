import { formatCurrency } from "./money.js";

const summary = document.querySelector(".results__summary");
const list = document.querySelector(".result-list");
const skeleton = document.querySelector("#skeleton");
const result = document.querySelector("#result");
const searchError = document.querySelector("#search-error");
const status = document.querySelector(".results__status");

export function show(state, data, onRetry) {
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
  const badge = node.querySelector(".badge");

  node.querySelector(".result__category").textContent = product.category ?? "";
  node.querySelector(".result__name").textContent = product.title;
  node.querySelector(".result__vendor").textContent = product.brand ?? "";

  if (product.price == null || !product.availabilityStatus) {
    const price = node.querySelector(".price");
    const offer = document.createElement("div");
    offer.className = "result__offer";
    price.textContent = "Price unavailable";
    price.classList.add("price--missing");
    price.before(offer);
    node.querySelector(".result__eta").remove();
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "button button--secondary result__retry";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => onRetry());
    offer.append(price, retry);
    badge.remove();
    return node;
  }

  const availability = product.availabilityStatus.toLowerCase();
  node.querySelector(".price").textContent = formatCurrency(product.price);

  if (availability === "in stock") {
    badge.className = "badge badge__in-stock";
    badge.textContent = "Available";
    node.querySelector(".result__eta-text").textContent =
      product.shippingInformation;
  } else if (availability === "low stock") {
    badge.className = "badge badge__low-stock";
    badge.textContent = "Only a few left";
    node.querySelector(".result__eta").remove();
  }

  return node;
}

export function showEmpty() {
  status.replaceChildren();
  summary.textContent = "";
  list.replaceChildren();
  list.removeAttribute("aria-busy");
}
