# Product Search

A small product search app in a **pnpm + Turborepo** monorepo. One Node process ([`apps/api`](apps/api)) serves the static UI from [`apps/web`](apps/web) and a JSON API. Catalog and offers live in **Postgres** (local [Supabase](https://supabase.com/docs/guides/cli)); [`apps/api/data/`](apps/api/data/) JSON files are the **seed source** only. Search matches title, description, category, brand, and **tags**. Results can be filtered by one category and sorted by price.

| Package       | Path              | Role                                |
| ------------- | ----------------- | ----------------------------------- |
| `@mrd/api`    | `apps/api`        | Express API and Vitest server tests |
| `@mrd/web`    | `apps/web`        | Static UI (`tsc` → `dist/`)         |
| `@mrd/shared` | `packages/shared` | Shared types (e.g. `Enrichment`)    |
| `@mrd/db`     | `packages/db`     | Postgres pool, queries, seed script |

How the process, database, and page fit together is in [ARCHITECTURE.md](ARCHITECTURE.md).

Search, categories, and suggestions query **Postgres on each request** (no catalog snapshot in the process). `GET /products` runs one SQL statement that filters, joins `offers`, sorts by price, and pages (max **40**). Category chips use `select distinct category` on `products.category`. Responses are still `200`; `enrichment` is `"ok"`, `"partial"`, or `"failed"` from the rows returned. **`attempts`** is `1` when rows matched (`0` when none). Non-`ok` responses include `Cache-Control: no-store`. A database error on the product query returns **500**.

For local testing, **`OFFERS_UPSTREAM`** simulates offer availability: **`up`** (default, real join), **`partial`** (stable omitted ids — even product ids by default, or **`OFFERS_OMIT_IDS=2,4`**), **`down`** (names only, `enrichment: "failed"`). Restart the API after changing these; per-card **Try again** does not fill an omitted id until the env changes.

The API returns at most **40** enriched hits per search (`limit` max **40**; the page fetches `limit=40` once). If more than 40 products match, only the first 40 in enriched sort order are available (see `SOLUTION.md`).

## Requirements

- Node.js 22 or later
- [pnpm](https://pnpm.io/) 9+
- For local app run: [Docker](https://www.docker.com/) and [Supabase CLI](https://supabase.com/docs/guides/cli)

## Run locally

1. Start Supabase and seed:

   ```bash
   supabase start
   pnpm db:seed
   ```

2. Export `USE_DATABASE=1` and `DATABASE_URL`. The values for local Supabase are in [`.env.example`](.env.example). The process reads the environment only; it does not load a `.env` file.

3. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

**`pnpm dev`** runs **`predev`** first (`@mrd/web` build) so [`apps/web/dist/main.js`](apps/web/dist/main.js) exists, then API watch and web `tsc -w`. The server listens on port **3000** unless `PORT` is set. Open [http://localhost:3000](http://localhost:3000).

Unit tests mock `@mrd/db` and do not require Postgres in CI.

### Git hooks and CI

- **Husky** (after `pnpm install`): [`.husky/pre-commit`](.husky/pre-commit) runs **`pnpm format:check`** only.
- **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm format:check` (no Postgres in CI).

Run `pnpm test` and `pnpm typecheck` locally before pushing if you want the same coverage as CI.

`PORT` defaults to **3000**. Set it in the environment when you want another port:

```bash
PORT=3001 pnpm dev
```

Other scripts:

| Script         | What it does                                            |
| -------------- | ------------------------------------------------------- |
| `pnpm dev`     | API watch + web `tsc -w`                                |
| `pnpm build`   | Turbo: `@mrd/db`, `@mrd/shared`, `@mrd/web`, `@mrd/api` |
| `pnpm test`    | Turbo: API, web, and db unit tests                      |
| `pnpm start`   | `node apps/api/dist/index.js` after `pnpm build`        |
| `pnpm db:seed` | Seed Postgres from `apps/api/data/*.json`               |
| `pnpm db:ping` | Check `DATABASE_URL` connectivity                       |

## Production

Build the workspace, then start the API. The Node process speaks HTTP only. Terminate TLS on a reverse proxy in front of `PORT`.

```bash
pnpm install
pnpm build
USE_DATABASE=1 DATABASE_URL=postgresql://… PORT=3000 pnpm start
```

`pnpm build` compiles `@mrd/db`, `@mrd/shared`, `@mrd/web` (`apps/web/dist/`), and `@mrd/api` (`apps/api/dist/`). `pnpm start` runs `node apps/api/dist/index.js`. Express serves static files from [`apps/web`](apps/web) (including `dist/main.js`), resolved from the API `dist/` directory, so those folders have to stay in the monorepo layout. Starting a copied `dist/index.js` on its own will not find the page.

The database must already exist. Apply [`supabase/migrations/`](supabase/migrations/) (`supabase start` does this locally), then run `pnpm db:seed` once on a fresh database. Seed reads [`apps/api/data/`](apps/api/data/) and truncates `products` and `offers` before insert. Search does not read those JSON files at runtime.

### Seed data layout and migration

Pricing lives in **`offers.json`**, not in `catalog.json`. Each product row in `catalog.json` holds catalog fields only (`title`, `description`, `category`, optional `brand`/`tags`, and the rest in `payload` after seed). Matching rows in `offers.json` use the same numeric `id` as `product_id` in Postgres (`price`, `availabilityStatus`, `shippingInformation`).

If you already seeded from an older layout that embedded those three fields on each product object, **re-run `pnpm db:seed`** after pulling the split JSON files. The seed script truncates and reloads both tables, so local/dev data is replaced; there is no separate SQL migration for offer columns because they were always in the `offers` table ([`supabase/migrations/`](supabase/migrations/)).

For backward compatibility, the seed script still accepts legacy `catalog.json` entries that include inline `price`, `availabilityStatus`, and `shippingInformation`. Those values are inserted into `offers` and stripped from `products.payload`. When both legacy catalog fields and `offers.json` define the same id, **`offers.json` wins**.

Set `USE_DATABASE=1` and `DATABASE_URL` on the process. `PORT` defaults to `3000`. Optional **`OFFERS_UPSTREAM=up|partial|down`** (default `up`). `GET /health` is the process check after startup **`ping()`**.

## API

All routes are on the same origin as the page. With **`OFFERS_UPSTREAM=down`**, `GET /products` still returns `200` with product names and `enrichment: "failed"`. **`partial`** returns mixed prices on one page. A failed product SQL query is **500**. A browser network error is separate from those responses.

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
