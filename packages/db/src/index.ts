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
