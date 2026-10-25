// Keep in sync with src/enrich.ts (isEnriched, enrichmentStatus).
import { enrichmentStatus, isEnriched } from "./enrichment.js";
import type { EnrichedProduct } from "./types.js";

const base: EnrichedProduct = {
  id: 1,
  title: "A",
  description: "",
  category: "x",
};

describe("isEnriched", () => {
  it("requires price and availabilityStatus", () => {
    expect(isEnriched({ ...base, price: 1 })).toBe(false);
    expect(
      isEnriched({ ...base, price: 1, availabilityStatus: "In Stock" }),
    ).toBe(true);
  });
});

describe("enrichmentStatus", () => {
  it("returns ok for empty list", () => {
    expect(enrichmentStatus([])).toBe("ok");
  });

  it("returns ok when all rows enriched", () => {
    expect(
      enrichmentStatus([
        { ...base, price: 1, availabilityStatus: "In Stock" },
        { ...base, id: 2, price: 2, availabilityStatus: "In Stock" },
      ]),
    ).toBe("ok");
  });

  it("returns failed when none enriched", () => {
    expect(enrichmentStatus([base, { ...base, id: 2 }])).toBe("failed");
  });

  it("returns partial when some enriched", () => {
    expect(
      enrichmentStatus([
        { ...base, price: 1, availabilityStatus: "In Stock" },
        { ...base, id: 2 },
      ]),
    ).toBe("partial");
  });
});
