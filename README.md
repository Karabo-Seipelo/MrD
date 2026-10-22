# Product Search

A small product search app. One Node process serves a static page from `client/` and a JSON API. The catalog is 40 local products in `data/catalog.json`; price, availability, and delivery live in `data/offers.json` (one row per product id). Search matches title, description, category, and brand. Results can be filtered by one category and sorted by price.

Search reads the local catalog. `GET /products` then calls an in-process upstream (`fetchOffers` over `offers.json`) for price, availability, and delivery: 100–800 ms, with a wholesale failure about one time in five and occasional per-id omissions. Responses are still `200`; `enrichment` is `"ok"`, `"partial"`, or `"failed"`. Category names and type-ahead suggestions read the in-memory catalog and do not pay that delay.

## Requirements

- Node.js 22 or later
- [pnpm](https://pnpm.io/) (or npm)

## Run locally

```bash
pnpm install
pnpm dev
```

`npm install` and `npm run dev` work the same way. The server listens on port **3000** unless `PORT` is set. Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env` if you want a different port. The app reads `PORT` from the environment; it does not load `.env` itself.

```bash
PORT=3001 pnpm dev
```

Other scripts:

| Script       | What it does                                 |
| ------------ | -------------------------------------------- |
| `pnpm dev`   | Start with `tsx watch`                       |
| `pnpm test`  | Run Vitest once                              |
| `pnpm build` | Compile TypeScript to `dist/`                |
| `pnpm start` | Run the compiled server (`pnpm build` first) |

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
- `limit` — page size (default `10`, max `40`). `total` is the full hit count before paging.

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
  "enrichment": "ok"
}
```

`enrichment` is `"ok"`, `"partial"`, or `"failed"`. On `"ok"`, every product includes `price`, `availabilityStatus`, and `shippingInformation`. On `"partial"`, only some rows include them. On `"failed"`, none do; catalog fields (`title`, `brand`, `category`, and the rest) remain. An empty match list skips the upstream and returns `enrichment: "ok"`. The browser cache stores only `"ok"` responses.

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

The page at `/` is a search form, category chips, and a price sort. A bare `/` leaves the list empty. A link with `q`, `category`, `sort`, or `page` restores the form and runs the search. The browser fetches once per `q`/`category` (`limit=40`), then applies **price sort and UI pagination (10 per page) in memory** — changing sort or Previous/Next does not call the API again. `sort` and `page` stay in the URL for sharing. Filter changes reset to page 1 and refetch. While `GET /products` is in flight the list shows one skeleton row. Each card shows the category above the name. When enrichment succeeds, the card shows the price, availability, and delivery time. When it fails, the card shows “Price unavailable” and a Try again button that runs the search again. A network error shows a retry panel and clears the list.
