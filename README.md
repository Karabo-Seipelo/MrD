# Product Search

A small product search app. One Node process serves a static page from `client/` and a JSON API. The catalog is 40 local products in `data/catalog.json`. Search matches title, description, category, and brand. Results can be filtered by one category and sorted by price.

Search reads the local catalog. `GET /products` then calls an in-process upstream for price, availability, and delivery: 100–800 ms, and it fails about one time in five. A failure is still `200`, with `enrichment: "failed"` and those fields omitted. Category names and type-ahead suggestions read the in-memory catalog and do not pay that delay.

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

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start with `tsx watch` |
| `pnpm test` | Run Vitest once |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run the compiled server (`pnpm build` first) |

## API

All routes are on the same origin as the page. When the simulated upstream fails, `GET /products` still returns `200` with the matching products and `enrichment: "failed"`. Price, availability, and delivery are omitted. A network failure is separate from that response.

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

```bash
curl "http://localhost:3000/products"
curl "http://localhost:3000/products?q=mascara"
curl "http://localhost:3000/products?category=beauty"
curl "http://localhost:3000/products?q=cream&category=beauty&sort=desc"
```

Success:

```json
{ "products": [], "total": 0, "query": "mascara", "enrichment": "ok" }
```

`enrichment` is `"ok"` or `"failed"`. On `"ok"`, each product includes `price`, `availabilityStatus`, and `shippingInformation` from the upstream. On `"failed"`, those three fields are absent and the rest of the catalog object remains (`title`, `brand`, `category`, and the rest). An empty match list skips the upstream and returns `enrichment: "ok"`.

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

The page at `/` is a search form, category chips, and a price sort. A bare `/` leaves the list empty. A link with `q`, `category`, or `sort` restores the form and runs the search. While `GET /products` is in flight the list shows one skeleton row. Each card shows the category above the name. When enrichment succeeds, the card shows the price, availability, and delivery time. When it fails, the card shows “Price unavailable” and a Try again button that runs the search again. A network error shows a retry panel and clears the list.
