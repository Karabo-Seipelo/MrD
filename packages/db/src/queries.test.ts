import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("./pool.js", () => ({
  getPool: () => ({ query }),
}));

describe("db queries", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("listCatalogProducts maps rows", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          title: "A",
          description: "d",
          category: "beauty",
          brand: "Essence",
          tags: ["beauty"],
        },
      ],
    });
    const { listCatalogProducts } = await import("./queries.js");
    await expect(listCatalogProducts()).resolves.toEqual([
      {
        id: 1,
        title: "A",
        description: "d",
        category: "beauty",
        brand: "Essence",
        tags: ["beauty"],
      },
    ]);
  });

  it("listCategories returns distinct names", async () => {
    query.mockResolvedValueOnce({
      rows: [{ category: "beauty" }, { category: "fragrances" }],
    });
    const { listCategories } = await import("./queries.js");
    await expect(listCategories()).resolves.toEqual(["beauty", "fragrances"]);
  });

  it("fetchOffersByIds maps offer rows", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          product_id: 2,
          price: "19.99",
          availability_status: "In Stock",
          shipping_information: "Delivery 35-50 min",
        },
      ],
    });
    const { fetchOffersByIds } = await import("./queries.js");
    await expect(fetchOffersByIds([2])).resolves.toEqual([
      {
        id: 2,
        price: 19.99,
        availabilityStatus: "In Stock",
        shippingInformation: "Delivery 35-50 min",
      },
    ]);
  });
});
