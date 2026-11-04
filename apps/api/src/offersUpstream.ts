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
