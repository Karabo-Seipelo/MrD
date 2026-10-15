import { fetchCatalog } from "./upstream.js";

describe("fetchCatalog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the local catalog after the delay", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.9);

    let settled = false;
    const pending = fetchCatalog().then((catalog) => {
      settled = true;
      return catalog;
    });

    await vi.advanceTimersByTimeAsync(99);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const catalog = await pending;

    expect(catalog.products).toHaveLength(40);
    expect(catalog.products[0].title).toBe("Essence Mascara Lash Princess");
  });

  it("fails when the upstream catalog error triggers", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.1);

    const pending = fetchCatalog();
    const failed = expect(pending).rejects.toThrow("upstream catalog failed");

    await vi.advanceTimersByTimeAsync(100);
    await failed;
  });
});
