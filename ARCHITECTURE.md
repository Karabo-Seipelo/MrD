# Architecture

One Node process serves the page and the JSON API. Postgres holds the catalog. After startup, search and suggestions run against an in-memory copy. Price and availability come from an in-process simulator, not from another HTTP service.

Behaviour and trade-offs are in [SOLUTION.md](SOLUTION.md). How to run it is in [README.md](README.md).

## System

```mermaid
flowchart LR
  browser["Browser"]
  api["Node process<br/>apps/api"]
  web["Static files<br/>apps/web"]
  db[("Postgres<br/>products, offers")]
  json["apps/api/data<br/>catalog.json, offers.json"]
  seed["pnpm db:seed"]

  browser -->|"GET / and /dist/main.js"| api
  browser -->|"GET /products, /offers,<br/>/products/categories, /products/suggest"| api
  api --- web
  api -->|"startup load only"| db
  json --> seed
  seed -->|"truncate and insert"| db
```

The browser never opens a database connection. `fetchOffers` never leaves the process. JSON files are read by the seed script, not by request handlers.

## Packages

```mermaid
flowchart TB
  web["@mrd/web<br/>apps/web"]
  api["@mrd/api<br/>apps/api"]
  shared["@mrd/shared<br/>Enrichment"]
  dbpkg["@mrd/db<br/>pool, queries, seed"]
  pg[("Postgres")]

  web --> shared
  api --> dbpkg
  dbpkg --> pg
```

`@mrd/api` does not import `@mrd/shared`. The API declares its own `Enrichment` union in [`apps/api/src/enrich.ts`](apps/api/src/enrich.ts). The page re-exports the same union from [`packages/shared/src/index.ts`](packages/shared/src/index.ts).

## Startup

```mermaid
sequenceDiagram
  participant Index as apps/api/src/index.ts
  participant Up as initUpstream
  participant Db as @mrd/db
  participant Pg as Postgres
  participant Mem as in-memory catalog and offers

  Index->>Up: initUpstream()
  alt USE_DATABASE is not 1
    Up-->>Index: throw
  else DATABASE_URL missing
    Db-->>Index: throw
  else
    Up->>Db: listCatalogProducts()
    Db->>Pg: select products order by id
    Up->>Db: listAllOffers()
    Db->>Pg: select offers order by product_id
    Up->>Up: product ids must match offer ids
    Up->>Mem: keep both for the process lifetime
    Index->>Index: listen on PORT (default 3000)
  end
```

Express ([`apps/api/src/app.ts`](apps/api/src/app.ts)) mounts JSON parsing, static files from `apps/web`, then [`productsRouter`](apps/api/src/routes/products.ts). Compiled code lives in `apps/api/dist`; `../../web` from that directory is `apps/web`, which serves `index.html` and `dist/main.js`.

A reseed is invisible until the process starts again. Search does not query Postgres per request.

## Request paths

Cheap reads stay on the snapshot. Search and per-card retry pay the simulator.

```mermaid
flowchart TB
  req["HTTP request"]
  req --> health["GET /health"]
  req --> cats["GET /products/categories"]
  req --> sug["GET /products/suggest"]
  req --> products["GET /products"]
  req --> offers["GET /offers"]

  health --> ok["200 JSON"]
  cats --> mem["in-memory catalog"]
  sug --> mem
  mem --> ok

  products --> filter["queryProducts<br/>q, category, tags"]
  offers --> byId["productsByIds"]
  filter --> empty{"any hits?"}
  empty -->|no| ok
  empty -->|yes| enrich["enrichProductsWithRetry"]
  byId --> enrich
  enrich --> sim["fetchOffers<br/>100 to 800 ms"]
  sim --> enrich
  enrich --> page["sort, then page slice"]
  page --> cache{"enrichment ok?"}
  cache -->|yes| ok
  cache -->|no| nostore["200 and Cache-Control: no-store"]
```

`fetchOffers` ([`apps/api/src/upstream.ts`](apps/api/src/upstream.ts)) waits, throws about one time in five (`upstream offers failed`), and on success can drop individual ids (about 15%). [`enrichProductsWithRetry`](apps/api/src/enrich.ts) retries the whole batch on a throw, and missing ids only on a partial result, until **3 attempts or 2.5s** (`ENRICH_MAX_ATTEMPTS`, `ENRICH_MAX_MS`). The HTTP status stays `200`. `enrichment` is `ok`, `partial`, or `failed`.

`GET /products` enriches the full match set, sorts by price, then returns at most `limit` rows (max **40**). `total` is the full hit count.

## Page

The page is compiled TypeScript with no bundler: [`apps/web/src/main.ts`](apps/web/src/main.ts) → `apps/web/dist/main.js`.

```mermaid
flowchart LR
  url["URL<br/>q, category, sort, page"]
  search["search.ts"]
  session["search session LRU<br/>max 20, key is q + category"]
  view["sort.ts applyView<br/>5 rows per page"]
  api["GET /products?limit=40"]
  card["GET /offers?ids="]

  url --> search
  search -->|"cache hit and enrichment ok"| view
  search -->|"miss or refetch"| api
  api --> search
  search --> session
  search --> view
  view -->|"Try again on one card"| card
  card --> session
```

Sort and Previous/Next do not call the API again. They rewrite the URL and re-render the session. A filter change resets to page 1 and fetches. Only sessions whose merged rows are fully enriched are stored. Suggest titles sit in a separate in-memory map and abort the previous request.

A bare `/` leaves the list empty. A URL with `q`, `category`, `sort`, or `page` restores the form and runs search. Unknown query keys are dropped. `category` must match a name from `GET /products/categories`.

## Data

```mermaid
erDiagram
  products ||--|| offers : "product_id"

  products {
    int id PK
    text title
    text description
    text category
    text brand
    text tags
    jsonb payload
  }

  offers {
    int product_id PK
    numeric price
    text availability_status
    text shipping_information
  }
```

Schema: [`supabase/migrations/20260322220000_products_offers.sql`](supabase/migrations/20260322220000_products_offers.sql). Seed maps `catalog.json` into `products` (search fields as columns, the rest in `payload`) and `offers.json` into `offers`. Runtime `listCatalogProducts` selects the search columns only, not `payload`.

## Tests and the database

API tests mock `@mrd/db` with the JSON files ([`apps/api/vitest.setup.ts`](apps/api/vitest.setup.ts)), then call `initUpstream`. CI does not start Postgres. Web tests exercise URL parsing, sort, merge, enrichment, and the session cache without a server. `@mrd/db` tests mock the pool.

## Outside this process

These are not part of the running architecture. They are tracked in [TODO.md](TODO.md): Redis, HTTP cache headers on static files, a real HTTP offers upstream, rate limits, helmet, and graceful shutdown. The simulator’s fail rates are constants in `upstream.ts`, not environment variables.
