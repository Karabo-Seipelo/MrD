import { queryProducts, type Product } from "./search.js";

const products: Product[] = [
  {
    title: "Essence Mascara",
    description: "Volumizing mascara",
    category: "beauty",
    brand: "Essence",
    tags: ["mascara"],
    price: 12,
  },
  {
    title: "Red Lipstick",
    description: "Bold cream lipstick",
    category: "beauty",
    brand: "Chic",
    tags: ["lipstick"],
    price: 8,
  },
  {
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

  it("sorts by price from low to high", () => {
    const results = queryProducts(products, "", "");
    expect(results.map((product) => product.price)).toEqual([2, 8, 12]);
  });

  it("sorts by price from high to low", () => {
    const results = queryProducts(products, "", "", "desc");
    expect(results.map((product) => product.price)).toEqual([12, 8, 2]);
  });
});
