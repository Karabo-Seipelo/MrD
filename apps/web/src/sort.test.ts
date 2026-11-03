import { paginate, sortByPrice } from "./sort.js";
import type { EnrichedProduct } from "./types.js";

describe("sortByPrice", () => {
  const products: EnrichedProduct[] = [
    { id: 1, title: "A", description: "", category: "x", price: 12 },
    { id: 2, title: "B", description: "", category: "x", price: 8 },
    { id: 3, title: "C", description: "", category: "x" },
  ];

  it("sorts ascending with unpriced rows last", () => {
    expect(sortByPrice(products, "asc").map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("sorts descending with unpriced rows last", () => {
    expect(sortByPrice(products, "desc").map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("paginate", () => {
  it("returns a window", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });
});
