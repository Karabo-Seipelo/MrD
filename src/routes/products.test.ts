import express from "express";
import request from "supertest";
import { productsRouter } from "./products.js";
import { fetchOffers, listCategories } from "../upstream.js";

vi.mock("../upstream.js", async (importOriginal) => {
  const upstream = await importOriginal<typeof import("../upstream.js")>();
  return {
    ...upstream,
    fetchOffers: vi.fn(),
    listCategories: vi.fn(),
  };
});

const app = express();
app.use(productsRouter);

function offersFor(ids: number[], priceFor: (id: number) => number) {
  return ids.map((id) => ({
    id,
    price: priceFor(id),
    availabilityStatus: "In Stock",
    shippingInformation: "Delivery 25-35 min",
  }));
}

describe("Products router", () => {
  it("enriches matches with the upstream price", async () => {
    vi.mocked(fetchOffers).mockImplementation(async (ids: number[]) =>
      offersFor(ids, () => 30),
    );

    const response = await request(app).get("/products").query({
      q: "mascara",
      category: "beauty",
      sort: "asc",
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("ok");
    expect(response.body.query).toEqual("mascara");
    expect(response.body.total).toBe(1);
    expect(response.body.products[0]).toMatchObject({
      id: 1,
      title: "Essence Mascara Lash Princess",
      price: 30,
      availabilityStatus: "In Stock",
      shippingInformation: "Delivery 25-35 min",
    });
  });

  it("paginates results after sorting", async () => {
    vi.mocked(fetchOffers).mockImplementation(async (ids: number[]) =>
      offersFor(ids, (id) => id),
    );

    const page1 = await request(app).get("/products").query({
      category: "beauty",
      limit: 2,
      page: 1,
      sort: "desc",
    });
    const page3 = await request(app).get("/products").query({
      category: "beauty",
      limit: 2,
      page: 3,
      sort: "desc",
    });

    expect(page1.body.total).toBe(5);
    expect(page1.body.page).toBe(1);
    expect(page1.body.limit).toBe(2);
    expect(page1.body.products.map((product: { id: number }) => product.id)).toEqual(
      [5, 4],
    );
    expect(page3.body.products.map((product: { id: number }) => product.id)).toEqual(
      [1],
    );
  });

  it("paginates on wholesale upstream failure", async () => {
    vi.mocked(fetchOffers).mockRejectedValue(
      new Error("upstream offers failed"),
    );

    const response = await request(app).get("/products").query({
      category: "beauty",
      limit: 2,
      page: 2,
    });

    expect(response.body.enrichment).toBe("failed");
    expect(response.body.total).toBe(5);
    expect(response.body.products).toHaveLength(2);
  });

  it("sorts by the enriched price", async () => {
    vi.mocked(fetchOffers).mockImplementation(async (ids: number[]) =>
      offersFor(ids, (id) => id),
    );

    const response = await request(app).get("/products").query({
      category: "beauty",
      sort: "desc",
    });

    expect(
      response.body.products.map((product: { id: number }) => product.id),
    ).toEqual([5, 4, 3, 2, 1]);
  });

  it("flags partial enrichment when only some offers return", async () => {
    vi.mocked(fetchOffers).mockResolvedValue([
      {
        id: 1,
        price: 30,
        availabilityStatus: "In Stock",
        shippingInformation: "Delivery 25-35 min",
      },
    ]);

    const response = await request(app).get("/products").query({
      category: "beauty",
      sort: "asc",
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("partial");
    expect(response.body.total).toBe(5);

    const byId = Object.fromEntries(
      response.body.products.map((product: { id: number }) => [
        product.id,
        product,
      ]),
    );
    expect(byId[1].price).toBe(30);
    expect(byId[2].price).toBeUndefined();
    expect(byId[2].availabilityStatus).toBeUndefined();
  });

  it("flags partial enrichment when upstream returns no offers", async () => {
    vi.mocked(fetchOffers).mockResolvedValue([]);

    const response = await request(app).get("/products").query({
      category: "beauty",
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("partial");
    expect(response.body.total).toBe(5);
    for (const product of response.body.products) {
      expect(product.price).toBeUndefined();
      expect(product.availabilityStatus).toBeUndefined();
    }
  });

  it("returns the hits without price when the upstream fails", async () => {
    vi.mocked(fetchOffers).mockRejectedValue(
      new Error("upstream offers failed"),
    );

    const response = await request(app).get("/products").query({
      q: "mascara",
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("failed");
    expect(response.body.products[0]).toMatchObject({
      id: 1,
      title: "Essence Mascara Lash Princess",
    });
    expect(response.body.products[0].price).toBeUndefined();
    expect(response.body.products[0].availabilityStatus).toBeUndefined();
    expect(response.body.products[0].shippingInformation).toBeUndefined();
  });

  it("returns the catalog categories", async () => {
    vi.mocked(listCategories).mockResolvedValue(["beauty", "groceries"]);
    const response = await request(app).get("/products/categories");
    expect(response.status).toBe(200);
    expect(response.body.categories).toEqual(["beauty", "groceries"]);
  });

  it("returns title suggestions without calling upstream", async () => {
    vi.mocked(fetchOffers).mockClear();
    const response = await request(app).get("/products/suggest").query({
      q: "mas",
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toContain(
      "Essence Mascara Lash Princess",
    );
    expect(fetchOffers).not.toHaveBeenCalled();
  });
});
