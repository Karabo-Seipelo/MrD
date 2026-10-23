import { mergeProductOffers } from "./mergeOffers.js";
import { paginate, sortByPrice } from "./sort.js";

describe("sortByPrice", () => {
  const products = [
    { id: 1, price: 12 },
    { id: 2, price: 8 },
    { id: 3, price: null },
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

describe("mergeProductOffers", () => {
  it("keeps prior commercial fields when incoming omits them", () => {
    const previous = [
      {
        id: 1,
        title: "A",
        price: 10,
        availabilityStatus: "In Stock",
        shippingInformation: "25 min",
      },
    ];
    const incoming = [{ id: 1, title: "A" }];

    expect(mergeProductOffers(previous, incoming)).toEqual([
      {
        id: 1,
        title: "A",
        price: 10,
        availabilityStatus: "In Stock",
        shippingInformation: "25 min",
      },
    ]);
  });
});
