export type { DbCatalogProduct, DbOffer } from "./types.js";
export { closePool, getPool } from "./pool.js";
export {
  fetchOffersByIds,
  getCatalogProductsByIds,
  listAllOffers,
  listCatalogProducts,
  listCategories,
  ping,
} from "./queries.js";
export type {
  EnrichedCatalogRow,
  OffersUpstreamMode,
  SearchProductsParams,
  SearchProductsResult,
} from "./searchQueries.js";
export { searchProducts, suggestProductTitles } from "./searchQueries.js";
