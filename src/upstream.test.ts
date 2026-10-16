import { fetchCatalog } from "./upstream.js";

describe("fetchCatalog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fails on every 10th fetch and then succeeds again", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    for (let n = 1; n < 10; n++) {
      const pending = fetchCatalog();
      await vi.advanceTimersByTimeAsync(1500);
      await expect(pending).resolves.toHaveProperty("products");
    }
    const failed = fetchCatalog();
    const rejection = expect(failed).rejects.toThrow("upstream catalog failed");
    await vi.advanceTimersByTimeAsync(1500);
    await rejection;
    const again = fetchCatalog();
    await vi.advanceTimersByTimeAsync(1500);
    await expect(again).resolves.toHaveProperty("products");
  });
});
