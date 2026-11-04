import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";
import {
  paginate,
  queryProducts,
  sortByPrice,
  suggestProducts,
} from "./src/search.js";

process.env.USE_DATABASE = "1";

const dataDir = join(process.cwd(), "data");
const catalog = JSON.parse(
  readFileSync(join(dataDir, "catalog.json"), "utf-8"),
) as {
  products: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    brand?: string;
    tags?: string[];
  }>;
};
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

const offerById = new Map(offersFile.offers.map((offer) => [offer.id, offer]));

function enrichRow(
  product: (typeof catalog.products)[number],
  offersMode: string,
  omitIds: number[] | null,
) {
  let includeOffer = offersMode !== "down";
  if (includeOffer && offersMode === "partial") {
    if (omitIds && omitIds.length > 0) {
      includeOffer = !omitIds.includes(product.id);
    } else {
      includeOffer = product.id % 2 !== 0;
    }
  }

  if (!includeOffer) {
    return { ...product };
  }

  const offer = offerById.get(product.id);
  if (!offer) {
    return { ...product };
  }

  return {
    ...product,
    price: offer.price,
    availabilityStatus: offer.availabilityStatus,
    shippingInformation: offer.shippingInformation,
  };
}

vi.mock("@mrd/db", () => ({
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
  getCatalogProductsByIds: vi
    .fn()
    .mockImplementation(async (ids: number[]) =>
      catalog.products.filter((product) => ids.includes(product.id)),
    ),
  getPool: vi.fn(),
  closePool: vi.fn(),
  searchProducts: vi
    .fn()
    .mockImplementation(
      async (params: {
        q: string;
        category: string;
        sort: string;
        page: number;
        limit: number;
        offersMode: string;
        omitIds: number[] | null;
      }) => {
        const matches = queryProducts(
          catalog.products,
          params.q,
          params.category,
        );
        let rows = matches.map((product) =>
          enrichRow(product, params.offersMode, params.omitIds),
        );

        if (params.offersMode !== "down") {
          rows = sortByPrice(rows, params.sort);
        }

        const total = rows.length;
        const products = paginate(rows, params.page, params.limit);
        return { products, total };
      },
    ),
  suggestProductTitles: vi
    .fn()
    .mockImplementation(async (q: string, limit: number) =>
      suggestProducts(catalog.products, q, limit),
    ),
}));
