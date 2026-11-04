import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("./pool.js", () => ({
  getPool: () => ({ query }),
}));

describe("searchProducts", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns empty result when no rows", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const { searchProducts } = await import("./searchQueries.js");
    await expect(
      searchProducts({
        q: "x",
        category: "",
        sort: "asc",
        page: 1,
        limit: 10,
        offersMode: "up",
        omitIds: null,
      }),
    ).resolves.toEqual({ products: [], total: 0 });
  });

  it("maps joined offer columns", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          title: "A",
          description: "d",
          category: "beauty",
          brand: null,
          tags: [],
          price: "19.99",
          availability_status: "In Stock",
          shipping_information: "25 min",
          total: "1",
        },
      ],
    });

    const { searchProducts } = await import("./searchQueries.js");
    await expect(
      searchProducts({
        q: "",
        category: "beauty",
        sort: "asc",
        page: 1,
        limit: 10,
        offersMode: "up",
        omitIds: null,
      }),
    ).resolves.toEqual({
      total: 1,
      products: [
        {
          id: 1,
          title: "A",
          description: "d",
          category: "beauty",
          price: 19.99,
          availabilityStatus: "In Stock",
          shippingInformation: "25 min",
        },
      ],
    });
  });
});

describe("suggestProductTitles", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns empty for short q without querying", async () => {
    const { suggestProductTitles } = await import("./searchQueries.js");
    await expect(suggestProductTitles("a", 8)).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
