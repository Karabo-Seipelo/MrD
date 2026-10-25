# Product Search

A small product search app. One Node process serves a static page from `client/` and a JSON API. The catalog is 40 local products in `data/catalog.json`; price, availability, and delivery live in `data/offers.json` (one row per product id). Search matches title, description, category, brand, and **tags**. Results can be filtered by one category and sorted by price.

Search reads the local catalog. `GET /products` enriches via an in-process upstream (`fetchOffers` over `offers.json`) with **up to 3 attempts or 2.5s** per request by default (override with `ENRICH_MAX_ATTEMPTS` and `ENRICH_MAX_MS`). Retries cover wholesale failures and missing ids. Each attempt waits 100–800 ms and may fail wholesale or omit individual ids. Responses are still `200`; `enrichment` is `"ok"`, `"partial"`, or `"failed"`, with **`attempts`** counting upstream rounds. Non-`ok` responses include `Cache-Control: no-store`. Category names and type-ahead suggestions read the in-memory catalog and do not pay that delay.

The API returns at most **40** enriched hits per search (`limit` max **40**; the page fetches `limit=40` once). If more than 40 products match, only the first 40 in enriched sort order are available (see `SOLUTION.md`).

## Requirements

- Node.js 22 or later
- [pnpm](https://pnpm.io/) (or npm)

## Run locally

```bash
pnpm install
pnpm dev
```

`npm install` and `npm run dev` work the same way. **`pnpm dev`** runs **`predev`** first (`pnpm build:client`) so [`client/dist/main.js`](client/dist/main.js) exists, then the API (tsx watch) and client `tsc -w`. The server listens on port **3000** unless `PORT` is set. Open [http://localhost:3000](http://localhost:3000).

### Git hooks and CI

- **Husky** (after `pnpm install`): [`.husky/pre-commit`](.husky/pre-commit) runs **`pnpm format:check`** only.
- **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm format:check`.

Run `pnpm test` and `pnpm typecheck` locally before pushing if you want the same coverage as CI.

Copy `.env.example` to `.env` if you want a different port. The app reads `PORT` from the environment; it does not load `.env` itself.

```bash
PORT=3001 pnpm dev
```

Other scripts:

| Script              | What it does                                 |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | API watch + client `tsc -w` → `client/dist/` |
| `pnpm build:client` | Emit browser ESM to `client/dist/`           |
| `pnpm test`         | Vitest (server + `client/src` unit tests)    |
| `pnpm build`        | Server `dist/` + `client/dist/`              |
| `pnpm start`        | Run compiled server (`pnpm build` first)     |

## API

All routes are on the same origin as the page. When the simulated upstream fails wholesale, `GET /products` still returns `200` with the matching products and `enrichment: "failed"`. Partial success uses `enrichment: "partial"` (some or all rows missing price and availability). A network failure is separate from those responses.

### `GET /health`

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "timestamp": "2026-10-16T16:00:00.000Z" }
```

### `GET /products`

Query parameters:

- `q` — free text. Blank means no text filter.
- `category` — one category name. Blank means no category filter.
- `sort` — `asc` (default) or `desc`, by the enriched price. If enrichment fails, the hits stay in catalog order.
- `page` — 1-based page number (default `1`).
- `limit` — page size (default `10`, max `40`). `total` is the full hit count before paging. Values above `40` clamp to `40`.

**Server vs browser paging:** API clients can pass `page` and `limit` on each `GET /products` call; the server enriches the full match set, sorts, then returns one page. The **web UI** instead requests **`limit=40` once** per filter, keeps that window in memory, and paginates **5 rows per page** in the browser (sort changes do not refetch). If `total` exceeds the loaded window, the UI summary notes that only the first 40 matches are available.

```bash
curl "http://localhost:3000/products"
curl "http://localhost:3000/products?q=mascara"
curl "http://localhost:3000/products?category=beauty"
curl "http://localhost:3000/products?q=cream&category=beauty&sort=desc"
curl "http://localhost:3000/products?category=beauty&page=2&limit=2"
```

Success:

```json
{
  "products": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "query": "mascara",
  "enrichment": "ok",
  "attempts": 1
}
```

`enrichment` is `"ok"`, `"partial"`, or `"failed"`. On `"ok"`, every product in the match set includes `price`, `availabilityStatus`, and `shippingInformation`. On `"partial"`, only some rows include them. On `"failed"`, none do; catalog fields (`title`, `brand`, `category`, and the rest) remain. An empty match list skips the upstream and returns `enrichment: "ok"`. The browser cache stores only fully enriched sessions (after merge). A JSON Schema lives in [`schemas/products-response.json`](schemas/products-response.json); [`openapi.yaml`](openapi.yaml) embeds the same response shape for OpenAPI viewers.

### `GET /offers`

Enrich one or more catalog ids (comma-separated `ids`). Uses the same retry budget as search. Per-card **Try again** on the page calls this endpoint for a single id.

```bash
curl "http://localhost:3000/offers?ids=1,2"
```

### `GET /products/categories`

```bash
curl http://localhost:3000/products/categories
```

```json
{ "categories": ["beauty", "fragrances"] }
```

### `GET /products/suggest`

`q` is matched the same way as search. Suggestions need at least two characters. `limit` defaults to 8 and is capped at 20.

```bash
curl "http://localhost:3000/products/suggest?q=mas&limit=8"
```

```json
{ "suggestions": ["Essence Mascara Lash Princess"] }
```

## Manual requests

`api-tester/` has REST Client files for the same calls:

- `api-tester/health.http` — `GET /health`
- `api-tester/search.http` — `GET /products`, category and price sort, and `GET /products/suggest`

## Page

The page at `/` is a search form, category chips, and a price sort. A bare `/` leaves the list empty. A link with `q`, `category`, `sort`, or `page` restores the form and runs the search. The browser fetches once per `q`/`category` (`limit=40`), then applies **price sort and UI pagination (5 per page) in memory** — changing sort or Previous/Next does not call the API again. `sort` and `page` stay in the URL for sharing. Filter changes reset to page 1 and refetch. Partial or failed enrichment shows a short banner with **Try search again** (full refetch with merge). While `GET /products` is in flight the list shows one skeleton row. Each card shows the category above the name. When enrichment succeeds, the card shows the price, availability, and delivery time. When a row is missing price, the card shows “Price unavailable” and **Try again** (`GET /offers?ids=` for that product). A network error shows a retry panel and clears the list.
