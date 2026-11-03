import {
  paginate,
  parsePagination,
  queryProducts,
  sortByPrice,
  suggestProducts,
  type Product,
} from "./search.js";
import type { EnrichedProduct } from "./enrich.js";

const products: Product[] = [
  {
    id: 1,
    title: "Essence Mascara",
    description: "Volumizing mascara",
    category: "beauty",
    brand: "Essence",
    tags: ["mascara"],
  },
  {
    id: 2,
    title: "Red Lipstick",
    description: "Bold cream lipstick",
    category: "beauty",
    brand: "Chic",
    tags: ["lipstick"],
  },
  {
    id: 3,
    title: "Green Apple",
    description: "Fresh fruit",
    category: "groceries",
    tags: ["fruit"],
  },
];

const priced: EnrichedProduct[] = [
  { ...products[0], price: 12 },
  { ...products[1], price: 8 },
  { ...products[2], price: 2 },
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

  it("matches a product by tag when the query is tag-only", () => {
    const tagged: Product[] = [
      {
        id: 10,
        title: "Plain Snack",
        description: "A simple snack",
        category: "groceries",
        tags: ["unicorn"],
      },
    ];
    const results = queryProducts(tagged, "unicorn", "");
    expect(results.map((product) => product.title)).toEqual(["Plain Snack"]);
  });
});

describe("parsePagination", () => {
  it("uses defaults for invalid input", () => {
    expect(parsePagination(undefined, undefined)).toEqual({
      page: 1,
      limit: 10,
    });
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

describe("suggestProducts", () => {
  it("includes titles matched by tag-only query", () => {
    const tagged: Product[] = [
      {
        id: 10,
        title: "Plain Snack",
        description: "A simple snack",
        category: "groceries",
        tags: ["unicorn"],
      },
    ];
    expect(suggestProducts(tagged, "unicorn", 8)).toEqual(["Plain Snack"]);
  });
});

describe("sortByPrice", () => {
  it("sort by price from low to high", () => {
    const results = sortByPrice(priced, "asc");
    expect(results.map((product) => product.price)).toEqual([2, 8, 12]);
  });

  it("sort by price from high to low", () => {
    const results = sortByPrice(priced, "desc");
    expect(results.map((product) => product.price)).toEqual([12, 8, 2]);
  });
});
