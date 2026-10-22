import {
  paginate,
  parsePagination,
  queryProducts,
  sortByPrice,
  type Product,
} from "./search.js";

const products: Product[] = [
  {
    id: 1,
    title: "Essence Mascara",
    description: "Volumizing mascara",
    category: "beauty",
    brand: "Essence",
    tags: ["mascara"],
    price: 12,
  },
  {
    id: 2,
    title: "Red Lipstick",
    description: "Bold cream lipstick",
    category: "beauty",
    brand: "Chic",
    tags: ["lipstick"],
    price: 8,
  },
  {
    id: 3,
    title: "Green Apple",
    description: "Fresh fruit",
    category: "groceries",
    tags: ["fruit"],
    price: 2,
  },
];

describe("queryProducts", () => {
  it("matches free text", () => {
    const results = queryProducts(products, "mascara", "");

    expect(results.map((product) => product.title)).toEqual([
      "Essence Mascara",
    ]);
  });

  it("filters by category", () => {
    const results = queryProducts(products, "cream", "beauty");
    expect(results.map((product) => product.title)).toEqual(["Red Lipstick"]);
  });
});

describe("parsePagination", () => {
  it("uses defaults for invalid input", () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, limit: 10 });
    expect(parsePagination("x", "-1")).toEqual({ page: 1, limit: 10 });
  });

  it("clamps limit to the maximum", () => {
    expect(parsePagination(2, 100)).toEqual({ page: 2, limit: 40 });
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("returns the first page", () => {
    expect(paginate(items, 1, 2)).toEqual([1, 2]);
  });

  it("returns the last partial page", () => {
    expect(paginate(items, 3, 2)).toEqual([5]);
  });

  it("returns an empty array beyond the end", () => {
    expect(paginate(items, 10, 2)).toEqual([]);
  });
});

describe("sortByPrice", () => {
  it("sort by price from low to high", () => {
    const results = sortByPrice(products, "asc");
    expect(results.map((product) => product.price)).toEqual([2, 8, 12]);
  });

  it("sort by price from high to low", () => {
    const results = sortByPrice(products, "desc");
    expect(results.map((product) => product.price)).toEqual([12, 8, 2]);
  });
});
