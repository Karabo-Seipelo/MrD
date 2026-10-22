import { formatCurrency } from "./money.js";
import { setPage } from "./url.js";

const summary = document.querySelector(".results__summary");
const pager = document.querySelector(".pager");
const pagerRange = document.querySelector(".pager__range");
const pagerPrev = document.querySelector(".pager__prev");
const pagerNext = document.querySelector(".pager__next");
const list = document.querySelector(".result-list");
const skeleton = document.querySelector("#skeleton");
const result = document.querySelector("#result");
const searchError = document.querySelector("#search-error");
const status = document.querySelector(".results__status");

let retry = () => {};
let onPageChange = () => {};
let lastPage = 1;

list.addEventListener("click", (event) => {
  if (event.target.closest(".result__retry")) retry();
});

pagerPrev.addEventListener("click", () => onPageChange(lastPage - 1));
pagerNext.addEventListener("click", () => onPageChange(lastPage + 1));

function updatePager(data) {
  const total = data.total ?? 0;
  const page = data.page ?? 1;
  const limit = data.limit ?? 10;
  lastPage = page;
  setPage(page);

  if (total > limit) {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    pager.hidden = false;
    pagerRange.textContent = `Showing ${start}–${end} of ${total}`;
    pagerPrev.disabled = page <= 1;
    pagerNext.disabled = page * limit >= total;
    return;
  }

  pager.hidden = true;
}

export function show(state, data, handlers = {}) {
  retry = handlers.onRetry ?? (() => {});
  onPageChange = handlers.onPageChange ?? (() => {});

  if (state === "loading") {
    status.replaceChildren();
    summary.textContent = "Loading...";
    pager.hidden = true;
    list.setAttribute("aria-busy", true);
    list.replaceChildren(skeleton.content.cloneNode(true));
    return;
  }

  list.removeAttribute("aria-busy");

  if (state === "error") {
    summary.textContent = "";
    pager.hidden = true;
    list.replaceChildren();

    const node = searchError.content.cloneNode(true);
    node.querySelector(".button").addEventListener("click", retry);
    status.replaceChildren(node);
    return;
  }

  summary.textContent = `${data.total} results`;
  updatePager(data);
  list.replaceChildren(
    ...data.products.map((product) => card(product, retry)),
  );
  status.replaceChildren();
}

function card(product, onRetry) {
  const node = result.content.cloneNode(true);
  const offer = node.querySelector(".result__offer");
  const price = node.querySelector("[data-price]");
  const badge = node.querySelector(".badge");
  const eta = node.querySelector(".result__eta");

  node.querySelector(".result__category").textContent = product.category ?? "";
  node.querySelector(".result__name").textContent = product.title;
  node.querySelector(".result__vendor").textContent = product.brand ?? "";

  if (product.price == null || !product.availabilityStatus) {
    price.hidden = true;
    offer.hidden = false;
    eta.hidden = true;
    badge.hidden = true;

    return node;
  }

  price.textContent = formatCurrency(product.price);
  const availability = product.availabilityStatus.toLowerCase();

  if (availability === "in stock") {
    badge.className = "badge badge__in-stock";
    badge.textContent = "Available";
    node.querySelector(".result__eta-text").textContent =
      product.shippingInformation;
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
  pager.hidden = true;
  list.replaceChildren();
  list.removeAttribute("aria-busy");
}
