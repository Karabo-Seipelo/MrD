import { mergeProductOffers } from "./mergeOffers.js";
import type { EnrichedProduct } from "./types.js";

describe("mergeProductOffers", () => {
  it("keeps prior commercial fields when incoming omits them", () => {
    const previous: EnrichedProduct[] = [
      {
        id: 1,
        title: "A",
        description: "",
        category: "groceries",
        price: 10,
        availabilityStatus: "In Stock",
        shippingInformation: "25 min",
      },
    ];
    const incoming: EnrichedProduct[] = [
      { id: 1, title: "A", description: "", category: "groceries" },
    ];

    expect(mergeProductOffers(previous, incoming)).toEqual([
      {
        id: 1,
        title: "A",
        description: "",
        category: "groceries",
        price: 10,
        availabilityStatus: "In Stock",
        shippingInformation: "25 min",
      },
    ]);
  });
});
