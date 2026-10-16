import express from "express";
import request from "supertest";
import { productsRouter } from "./products.js";
import { fetchCatalog, listCategories } from "../upstream.js";

vi.mock("../upstream.js", () => ({
  fetchCatalog: vi.fn(),
  listCategories: vi.fn()
}));

const app = express();
app.use(productsRouter);

const products = [
  {
    title: "Essence Mascara",
    description: "Volumizing mascara",
    category: "beauty",
    price: 12,
  },
  {
    title: "Cheap Mascara",
    description: "Basic mascara",
    category: "beauty",
    price: 4,
  },
  {
    title: "Green Apple",
    description: "Fresh fruit",
    category: "groceries",
    price: 2,
  },
];

describe("Products router", () => {
  it("searchs, filters and sorts products", async () => {
    vi.mocked(fetchCatalog).mockResolvedValue({ products });

    const response = await request(app).get("/products").query({
      q: "mascara",
      category: "beauty",
      sort: "asc",
    });

    expect(response.status).toBe(200);
    expect(response.body.query).toEqual("mascara");
    expect(response.body.total).toBe(2);
    expect(
      response.body.products.map((product: { price: number }) => product.price),
    ).toEqual([4, 12]);
  });

  it("returns 503 when the upstream fails", async () => {
    vi.mocked(fetchCatalog).mockRejectedValue(
      new Error("upstream catalog failed"),
    );

    const response = await request(app).get("/products");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "upstream catalog failed",
    });
  });

  it("returns the catalog categories", async () => {
    vi.mocked(listCategories).mockResolvedValue(["beauty", "groceries"]);
      const response = await request(app).get("/products/categories");
      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual(["beauty", "groceries"])
  });
});
