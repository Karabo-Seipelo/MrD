import { beforeAll, vi } from "vitest";

vi.mock("@mrd/db", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");

  const dataDir = join(process.cwd(), "data");
  const catalog = JSON.parse(
    readFileSync(join(dataDir, "catalog.json"), "utf-8"),
  ) as { products: Array<Record<string, unknown>> };
  const offersFile = JSON.parse(
    readFileSync(join(dataDir, "offers.json"), "utf-8"),
  ) as {
    offers: Array<{
      id: number;
      price: number;
      availabilityStatus: string;
      shippingInformation: string;
    }>;
  };

  return {
    ping: vi.fn().mockResolvedValue(undefined),
    listCatalogProducts: vi.fn().mockResolvedValue(catalog.products),
    listCategories: vi
      .fn()
      .mockResolvedValue(
        [...new Set(catalog.products.map((p) => String(p.category)))].sort(),
      ),
    listAllOffers: vi.fn().mockResolvedValue(offersFile.offers),
    fetchOffersByIds: vi
      .fn()
      .mockImplementation(async (ids: number[]) =>
        offersFile.offers.filter((offer) => ids.includes(offer.id)),
      ),
    getCatalogProductsByIds: vi.fn(),
    getPool: vi.fn(),
    closePool: vi.fn(),
  };
});

beforeAll(async () => {
  process.env.USE_DATABASE = "1";
  const { initUpstream } = await import("./src/upstream.js");
  await initUpstream();
});
