import { fetchOffers } from "./upstream.js";

describe("fetchOffers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns price and availability for the requested ids", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const pending = fetchOffers([1]);
    await vi.advanceTimersByTimeAsync(800);
    await expect(pending).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        price: 9.99,
        availabilityStatus: "In Stock",
      }),
    ]);
  });

  it("fails when the random check falls in the first fifth", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const pending = fetchOffers([1]);
    const rejection = expect(pending).rejects.toThrow("upstream offers failed");
    await vi.advanceTimersByTimeAsync(800);
    await rejection;
  });
});
