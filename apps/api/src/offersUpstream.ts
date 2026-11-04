import {
  enrichmentStatus,
  type EnrichedProduct,
  type Enrichment,
} from "./enrich.js";

export type OffersUpstreamMode = "up" | "partial" | "down";

export function readOffersUpstreamMode(): OffersUpstreamMode {
  const raw = (process.env.OFFERS_UPSTREAM ?? "up").trim().toLowerCase();
  if (raw === "down" || raw === "partial") {
    return raw;
  }
  return "up";
}

/** When partial and this returns null, even product ids are omitted from the offer join. */
export function readOffersOmitIds(): number[] | null {
  const raw = process.env.OFFERS_OMIT_IDS?.trim();
  if (!raw) {
    return null;
  }

  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  return ids.length > 0 ? ids : null;
}

export function idsEligibleForOffers(
  ids: number[],
  mode: OffersUpstreamMode,
  omitIds: number[] | null,
): number[] {
  if (mode === "down") {
    return [];
  }

  if (mode === "up") {
    return ids;
  }

  if (omitIds && omitIds.length > 0) {
    const omitted = new Set(omitIds);
    return ids.filter((id) => !omitted.has(id));
  }

  return ids.filter((id) => id % 2 !== 0);
}

/** GET /offers enrichment: partial policy omitting every id is partial, not wholesale failed. */
export function resolveOffersRouteEnrichment(
  mode: OffersUpstreamMode,
  rows: EnrichedProduct[],
  eligibleCount: number,
): Enrichment {
  if (mode === "down") {
    return "failed";
  }
  if (mode === "partial" && rows.length > 0 && eligibleCount === 0) {
    return "partial";
  }
  return enrichmentStatus(rows);
}

export function resolveOffersRouteAttempts(
  mode: OffersUpstreamMode,
  productCount: number,
  eligibleCount: number,
): number {
  if (productCount === 0) {
    return 0;
  }
  if (mode === "down") {
    return 0;
  }
  return 1;
}
