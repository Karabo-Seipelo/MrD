import { afterEach, describe, expect, it } from "vitest";
import {
  idsEligibleForOffers,
  readOffersOmitIds,
  readOffersUpstreamMode,
} from "./offersUpstream.js";

describe("offersUpstream", () => {
  afterEach(() => {
    delete process.env.OFFERS_UPSTREAM;
    delete process.env.OFFERS_OMIT_IDS;
  });

  it("defaults to up", () => {
    expect(readOffersUpstreamMode()).toBe("up");
  });

  it("parses omit ids", () => {
    process.env.OFFERS_OMIT_IDS = "2, 4";
    expect(readOffersOmitIds()).toEqual([2, 4]);
  });

  it("filters even ids in partial mode without omit list", () => {
    expect(idsEligibleForOffers([1, 2, 3], "partial", null)).toEqual([1, 3]);
  });

  it("returns no ids when down", () => {
    expect(idsEligibleForOffers([1, 2], "down", null)).toEqual([]);
  });
});
