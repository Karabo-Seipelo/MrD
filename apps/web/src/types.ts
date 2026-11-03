export type { Enrichment } from "@mrd/shared";
import type { Enrichment } from "@mrd/shared";

export type SortOrder = "asc" | "desc";

export type CatalogProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
};

export type EnrichedProduct = CatalogProduct & {
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
};

export type ProductsResponse = {
  products: EnrichedProduct[];
  total: number;
  page?: number;
  limit?: number;
  query: string;
  enrichment: Enrichment;
  attempts?: number;
};

export type OffersResponse = {
  products: EnrichedProduct[];
  enrichment: Enrichment;
  attempts?: number;
};

export type SearchSession = {
  products: EnrichedProduct[];
  total: number;
  query: string;
  enrichment: Enrichment;
};

export type ResultsViewData = {
  products: EnrichedProduct[];
  total: number;
  loadedCount: number;
  query: string;
  page: number;
  limit: number;
  enrichment: Enrichment;
};

export type ShowState = "loading" | "error" | "results";
