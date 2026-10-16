# Product Search

A small product search app. One Node process serves a static page from `client/` and a JSON API. The catalog is 40 local products in `data/catalog.json`. Search matches title, description, category, and brand. Results can be filtered by one category and sorted by price.

`GET /products` waits on a simulated upstream: 100–800 ms, and it fails about one time in five. A failure returns `503`. Category names and type-ahead suggestions read the in-memory catalog and do not pay that delay.

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

All routes are on the same origin as the page. `GET /products` can return `503` with `{ "error": "upstream catalog failed" }` when the simulated upstream fails. Retry the request.

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
- `sort` — `asc` (default) or `desc`, by price.

```bash
curl "http://localhost:3000/products"
curl "http://localhost:3000/products?q=mascara"
curl "http://localhost:3000/products?category=beauty"
curl "http://localhost:3000/products?q=cream&category=beauty&sort=desc"
```

Success:

```json
{ "products": [], "total": 0, "query": "mascara" }
```

Each product is a full catalog object (`price`, `brand`, `availabilityStatus`, `shippingInformation`, and the rest).

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

The page at `/` is a search form, category chips, and a price sort. A bare `/` leaves the list empty. A link with `q`, `category`, or `sort` restores the form and runs the search. While `GET /products` is in flight the list shows one skeleton row. A `503` or a network error shows a retry panel.
