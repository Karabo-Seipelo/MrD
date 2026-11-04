import { buildProductSeedRows, mergeOfferSeedRows } from "./seedData.js";

describe("seedData", () => {
  it("prefers offers.json over legacy inline catalog pricing", () => {
    const merged = mergeOfferSeedRows(
      [
        {
          id: 1,
          price: 9.99,
          availabilityStatus: "In Stock",
          shippingInformation: "from file",
        },
      ],
      [
        {
          id: 1,
          title: "A",
          description: "d",
          category: "beauty",
          price: 1,
          availabilityStatus: "legacy",
          shippingInformation: "from catalog",
        },
      ],
    );

    expect(merged).toEqual([
      {
        productId: 1,
        price: 9.99,
        availabilityStatus: "In Stock",
        shippingInformation: "from file",
      },
    ]);
  });

  it("uses legacy catalog pricing when offers.json has no row", () => {
    const merged = mergeOfferSeedRows(
      [],
      [
        {
          id: 2,
          title: "B",
          description: "d",
          category: "beauty",
          price: 19.99,
          availabilityStatus: "Low Stock",
          shippingInformation: "legacy only",
        },
      ],
    );

    expect(merged).toEqual([
      {
        productId: 2,
        price: 19.99,
        availabilityStatus: "Low Stock",
        shippingInformation: "legacy only",
      },
    ]);
  });

  it("strips legacy offer fields from product payload", () => {
    const rows = buildProductSeedRows([
      {
        id: 1,
        title: "A",
        description: "d",
        category: "beauty",
        brand: "Essence",
        price: 9.99,
        availabilityStatus: "In Stock",
        shippingInformation: "legacy",
        rating: 4,
      },
    ]);

    expect(rows[0].payload).toEqual({ rating: 4 });
    expect(rows[0].payload).not.toHaveProperty("price");
  });
});
