import {
  enrichProductsWithRetry,
  type EnrichedProduct,
} from "./enrich.js";
import type { Product } from "./search.js";
import type { Offer } from "./upstream.js";

const matches: Product[] = [
  {
    id: 1,
    title: "One",
    description: "First",
    category: "beauty",
  },
  {
    id: 2,
    title: "Two",
    description: "Second",
    category: "beauty",
  },
];

function offer(id: number): Offer {
  return {
    id,
    price: id * 10,
    availabilityStatus: "In Stock",
    shippingInformation: "Delivery 25-35 min",
  };
}

describe("enrichProductsWithRetry", () => {
  it("retries after a wholesale failure then enriches all rows", async () => {
    const fetchOffers = vi
      .fn()
      .mockRejectedValueOnce(new Error("upstream offers failed"))
      .mockImplementation(async (ids: number[]) => ids.map(offer));

    const result = await enrichProductsWithRetry(
      matches,
      "asc",
      fetchOffers,
    );

    expect(fetchOffers).toHaveBeenCalledTimes(2);
    expect(result.enrichment).toBe("ok");
    expect(result.attempts).toBe(2);
    expect(result.products.every((p: EnrichedProduct) => p.price != null)).toBe(
      true,
    );
  });

  it("retries missing ids after a partial response", async () => {
    const fetchOffers = vi
      .fn()
      .mockResolvedValueOnce([offer(1)])
      .mockImplementation(async (ids: number[]) => ids.map(offer));

    const result = await enrichProductsWithRetry(
      matches,
      "asc",
      fetchOffers,
    );

    expect(fetchOffers).toHaveBeenCalledTimes(2);
    expect(fetchOffers.mock.calls[1][0]).toEqual([2]);
    expect(result.enrichment).toBe("ok");
  });

  it("returns failed when every attempt throws", async () => {
    const fetchOffers = vi
      .fn()
      .mockRejectedValue(new Error("upstream offers failed"));

    const result = await enrichProductsWithRetry(
      matches,
      "asc",
      fetchOffers,
      { maxAttempts: 3, maxMs: 2500 },
    );

    expect(fetchOffers).toHaveBeenCalledTimes(3);
    expect(result.enrichment).toBe("failed");
    expect(result.products[0].price).toBeUndefined();
  });

  it("stops when the time budget is exceeded", async () => {
    vi.useFakeTimers();
    const fetchOffers = vi.fn(
      () =>
        new Promise<Offer[]>((resolve) => {
          setTimeout(() => resolve([offer(1), offer(2)]), 500);
        }),
    );

    const pending = enrichProductsWithRetry(matches, "asc", fetchOffers, {
      maxAttempts: 10,
      maxMs: 100,
    });

    await vi.advanceTimersByTimeAsync(500);
    const result = await pending;

    expect(result.attempts).toBe(1);
    expect(fetchOffers).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
