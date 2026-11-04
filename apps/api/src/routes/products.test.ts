import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchProducts } from "@mrd/db";
import { productsRouter } from "./products.js";

const app = express();
app.use(productsRouter);

describe("Products router", () => {
  beforeEach(() => {
    process.env.OFFERS_UPSTREAM = "up";
    delete process.env.OFFERS_OMIT_IDS;
  });

  afterEach(() => {
    delete process.env.OFFERS_UPSTREAM;
    delete process.env.OFFERS_OMIT_IDS;
  });

  it("enriches matches with offer prices", async () => {
    const response = await request(app).get("/products").query({
      q: "mascara",
      category: "beauty",
      sort: "asc",
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("ok");
    expect(response.body.query).toEqual("mascara");
    expect(response.body.total).toBe(1);
    expect(response.body.attempts).toBe(1);
    expect(response.body.products[0]).toMatchObject({
      id: 1,
      title: "Essence Mascara Lash Princess",
      price: 9.99,
      availabilityStatus: "In Stock",
      shippingInformation: "Delivery 25-35 min",
    });
  });

  it("paginates results after sorting", async () => {
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
    expect(
      page1.body.products.map((product: { id: number }) => product.id),
    ).toEqual([2, 3]);
    expect(
      page3.body.products.map((product: { id: number }) => product.id),
    ).toEqual([5]);
  });

  it("returns failed enrichment when offers are down", async () => {
    process.env.OFFERS_UPSTREAM = "down";

    const response = await request(app).get("/products").query({
      category: "beauty",
      limit: 2,
      page: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("failed");
    expect(response.body.total).toBe(5);
    expect(response.body.products).toHaveLength(2);
    expect(response.body.products[0].price).toBeUndefined();
  });

  it("returns partial enrichment when offers are partial", async () => {
    process.env.OFFERS_UPSTREAM = "partial";

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
    expect(byId[1].price).toBeDefined();
    expect(byId[2].price).toBeUndefined();
  });

  it("returns 500 when searchProducts throws", async () => {
    vi.mocked(searchProducts).mockRejectedValueOnce(new Error("db down"));

    const response = await request(app).get("/products").query({
      q: "mascara",
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/db down/);
  });

  it("returns the catalog categories", async () => {
    const response = await request(app).get("/products/categories");
    expect(response.status).toBe(200);
    expect(response.body.categories).toContain("beauty");
    expect(response.body.categories).toContain("groceries");
  });

  it("enriches a subset via GET /offers", async () => {
    const response = await request(app).get("/offers").query({ ids: "1,2" });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(2);
    expect(response.body.enrichment).toBe("ok");
    expect(response.body.products[0].price).toBe(9.99);
    expect(response.body.attempts).toBe(1);
  });

  it("returns attempts 0 for GET /offers when ids match no products", async () => {
    const response = await request(app).get("/offers").query({ ids: "99999" });

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual([]);
    expect(response.body.attempts).toBe(0);
  });

  it("returns attempts 0 for GET /offers when offers upstream is down", async () => {
    process.env.OFFERS_UPSTREAM = "down";

    const response = await request(app).get("/offers").query({ ids: "1" });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("failed");
    expect(response.body.attempts).toBe(0);
  });

  it("returns partial for GET /offers when partial mode omits all requested ids", async () => {
    process.env.OFFERS_UPSTREAM = "partial";

    const response = await request(app).get("/offers").query({ ids: "2" });

    expect(response.status).toBe(200);
    expect(response.body.enrichment).toBe("partial");
    expect(response.body.attempts).toBe(1);
    expect(response.body.products[0].price).toBeUndefined();
  });

  it("returns title suggestions", async () => {
    const response = await request(app).get("/products/suggest").query({
      q: "mas",
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toContain(
      "Essence Mascara Lash Princess",
    );
  });
});
