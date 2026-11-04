# MrD — project tracker

Work **one backlog ID per commit** when you can. **You** create git commits. Before checking an item off, run `pnpm test` and `pnpm build` (or the subset that fits the change).

Ask Agent in **Agent mode**: _Implement **prod-03** from TODO.md_ (single ID per session). Framework work uses **fw-** IDs on the matching **ui/** branch; caching uses **cache-** IDs.

---

## Already done

- Client TypeScript (`apps/web/src/` → `apps/web/dist/`), `predev` + `pnpm dev` watch
- Search URL parse/canonicalize ([`apps/web/src/searchParams.ts`](apps/web/src/searchParams.ts))
- Enrichment retry, partial/failed UX, per-card `/offers`, client session merge
- CI: `pnpm build`, test, typecheck, format ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
- Husky: `pnpm format:check` only ([`.husky/pre-commit`](.husky/pre-commit))
- Review backlog tasks 1–14 (tests, UI empty state, OpenAPI inline schemas, README hooks/paging)
- Improvement backlog (search tags, shared types in upstream, etc.) — see git history / [`SOLUTION.md`](SOLUTION.md)
- **Monorepo:** `apps/api`, `apps/web`, `packages/shared`, `packages/db`; Turbo + pnpm workspace
- **Supabase Postgres:** migration, `pnpm db:seed` from [`apps/api/data/`](apps/api/data/); runtime catalog/offers via `@mrd/db` when `USE_DATABASE=1`
- **SQL:** parameterized queries in [`packages/db/src/queries.ts`](packages/db/src/queries.ts)
- Root `package.json` **description** filled (`pol-03`)
- **hyg-01** — N/A: no `client/scripts/` in repo; UI source is `apps/web/src/`
- **Runtime paths:** API static from [`apps/api/src/app.ts`](apps/api/src/app.ts) → `apps/web`; JSON under [`apps/api/data/`](apps/api/data/) is seed-only; catalog/offers queried per request (**data-01**)
- **Client caching (no Redis):** search session LRU + suggest map in [`apps/web/src/searchSession.ts`](apps/web/src/searchSession.ts) / [`suggestions.ts`](apps/web/src/suggestions.ts); API sets `Cache-Control: no-store` when enrichment ≠ `ok` ([`apps/api/src/routes/products.ts`](apps/api/src/routes/products.ts))
- **prod-01** — README **Production** section (`pnpm build` / `pnpm start`, env, migrations + seed, static layout, TLS at the proxy)
- **pol-01** — [`SOLUTION.md`](SOLUTION.md) synced to the monorepo, Postgres runtime, and current UI

---

## Phase 1 — Hygiene

- [x] **hyg-01** — Delete orphan `client/scripts/*.js` if still on disk (source is `apps/web/src/`). **Done:** folder absent; nothing to remove.  
      **Files:** remove any leftover [`client/scripts/`](client/scripts/)  
      **Commit:** `chore: remove obsolete client/scripts after TS migration` _(skipped)_

---

## Phase 1b — Request-time catalog

_First open task. The API must not keep a catalog or offer snapshot in the process._

- [x] **data-01** — Read products and offers from Postgres on each request. SQL search in [`packages/db/src/searchQueries.ts`](packages/db/src/searchQueries.ts); startup [`ping()`](packages/db/src/queries.ts) only; `OFFERS_UPSTREAM=up|partial|down` and optional `OFFERS_OMIT_IDS`.  
      **Commit:** `feat: query catalog and offers per request`

---

## Phase 2 — Production core

- [x] **prod-01** — README **Production** section: monorepo build (`pnpm build`), `pnpm start`; `USE_DATABASE=1`, `DATABASE_URL`; migrations + `pnpm db:seed` for fresh DB; ship API `dist/` + web assets; `PORT`; TLS at proxy.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: add production deployment section`

- [x] **prod-02** — _(Superseded by **data-01**.)_ Env-configurable offer simulation. Offers are rows in Postgres; do not add fail-rate or latency env vars.

- [ ] **prod-03** — Graceful shutdown on `SIGTERM` / `SIGINT` (HTTP server only; pool close is **sec-12**).  
      **Files:** [`apps/api/src/index.ts`](apps/api/src/index.ts)  
      **Commit:** `feat: graceful HTTP server shutdown`

- [ ] **prod-04** — `trust proxy` when `TRUST_PROXY=1`.  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts), `.env.example`  
      **Commit:** `feat: optional express trust proxy`

- [ ] **prod-05** — Verify/document runtime paths after **data-01**: static → [`apps/web`](apps/web); seed JSON → [`apps/api/data`](apps/api/data); catalog and offers queried per request (no startup snapshot, no JSON catalog load).  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts), [`apps/api/src/index.ts`](apps/api/src/index.ts), README  
      **Commit:** `docs: confirm runtime paths from dist`

---

## Phase 3 — Operability (public URL)

- [ ] **ops-01** — Optional `compression` (helmet is **sec-04**).  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts), [`apps/api/package.json`](apps/api/package.json)  
      **Commit:** `feat: response compression`

- [x] **ops-02** — _(Superseded by **sec-05** + **sec-06**.)_ Rate limit search/offers — implement those IDs instead. **No code here.**

- [ ] **ops-03** — Static `Cache-Control`: long cache for `apps/web/dist/*.js`, short/no-cache for `index.html`.  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts)  
      **Commit:** `feat: cache headers for static assets`

- [ ] **ops-04** — Deploy workflow or host runbook (Render/Fly/Railway/etc.): build, env (`DATABASE_URL`, `USE_DATABASE=1`), `/health`.  
      **Files:** `.github/workflows/` and/or README  
      **Commit:** `ci: add deploy workflow` or `docs: deployment runbook`

---

## Phase 3c — Caching (HTTP + optional Redis)

_Place after **prod-03** (shutdown hook exists) and alongside **ops-03** (static HTTP cache). API must run **without** Redis when `REDIS_URL` is unset (tests/CI unchanged)._

**Layers:** browser session LRU (done) → Express static headers (**ops-03**) → optional **Redis** cache-aside for hot GET routes.

### Docs & HTTP (no Redis)

- [ ] **cache-01** — README **Caching** section: client LRU/suggest map, per-request catalog reads (**data-01**, no process snapshot), `no-store` on failed enrichment, static assets (**ops-03**), planned Redis.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: caching layers overview`

- [ ] **cache-02** — Explicit `Cache-Control` on cheap reads: `/products/categories`, `/products/suggest` (e.g. short `public, max-age=…` or `private`; catalog changes on reseed/deploy). Document policy.  
      **Files:** [`apps/api/src/routes/products.ts`](apps/api/src/routes/products.ts), README  
      **Commit:** `feat: cache headers for categories and suggest`

- [ ] **cache-03** — Document `GET /products` policy: keep **`no-store`** for partial/failed; optional short **`private`** cache only when `enrichment=ok` (or defer to Redis in **cache-07**).  
      **Files:** README and/or route comments  
      **Commit:** `docs: product search cache policy`

### Redis via Docker

- [ ] **cache-04** — `docker-compose.yml` (or compose fragment) with **Redis 7** on `6379`; README: `docker compose up -d redis` alongside Supabase. Add optional `REDIS_URL=redis://127.0.0.1:6379` to [`.env.example`](.env.example).  
      **Files:** `docker-compose.yml`, README, `.env.example`  
      **Commit:** `chore: add Redis service for local cache`

- [ ] **cache-05** — Redis client module (e.g. `packages/cache` or `apps/api/src/cache/`): connect when `REDIS_URL` set; no-op stub when unset; health/log on connect failure.  
      **Files:** new package or api module, `apps/api/package.json`  
      **Commit:** `feat: optional Redis client`

- [ ] **cache-06** — Cache-aside **categories** + **suggest** responses in Redis (TTL env e.g. `CACHE_CATEGORIES_TTL_SEC`, `CACHE_SUGGEST_TTL_SEC`).  
      **Files:** routes + cache helper  
      **Commit:** `feat: redis cache for categories and suggest`

- [ ] **cache-07** — Cache-aside **`GET /products`** JSON only when response has `enrichment: "ok"`; key from normalized query params; TTL `CACHE_PRODUCTS_TTL_SEC`; never cache partial/failed.  
      **Files:** [`apps/api/src/routes/products.ts`](apps/api/src/routes/products.ts)  
      **Commit:** `feat: redis cache for successful product search`

- [ ] **cache-08** — Invalidate catalog cache on reseed: flush key prefix or call from [`packages/db/scripts/seed.ts`](packages/db/scripts/seed.ts) when `REDIS_URL` set; document manual `redis-cli` for dev.  
      **Files:** seed script and/or cache module, README  
      **Commit:** `feat: invalidate redis catalog cache on db seed`

- [ ] **cache-09** — Close Redis connection on shutdown (with **sec-12** / **prod-03**).  
      **Files:** [`apps/api/src/index.ts`](apps/api/src/index.ts)  
      **Commit:** `feat: close redis on shutdown`

### Optional

- [ ] **cache-10** — Back **sec-07** rate limits with Redis counters when `REDIS_URL` set (in-memory fallback when unset).  
      **Commit:** `feat: redis-backed rate limiting`

- [ ] **cache-11** — CI: optional job or service container Redis for integration test of cache-aside (or skip Redis in CI and document).  
      **Files:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)  
      **Commit:** `ci: optional redis integration test`

---

## Phase 3b — Security

_Small, reviewable commits. Run `pnpm audit` locally when touching deps._

### Supply chain

- [ ] **sec-01** — CI: run `pnpm audit` (start non-blocking or `--audit-level=high`; tighten later).  
      **Files:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)  
      **Commit:** `ci: add dependency audit step`

- [ ] **sec-02** — README **Security** subsection: never commit `.env`; prod `DATABASE_URL` via host secrets; rotate if leaked; local default `postgres:postgres` is dev-only.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: security and secrets handling`

- [ ] **sec-03** — Document dependency review cadence (monthly `pnpm audit`, Dependabot on GitHub if applicable).  
      **Files:** [`README.md`](README.md) or optional `SECURITY.md`  
      **Commit:** `docs: dependency review cadence`

### HTTP hardening (before public URL)

- [ ] **sec-04** — `helmet` default security headers on API + static.  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts), [`apps/api/package.json`](apps/api/package.json)  
      **Commit:** `feat: add helmet security headers`

- [ ] **sec-05** — Rate limit `GET /products` (expensive enrich path).  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts) or [`apps/api/src/routes/products.ts`](apps/api/src/routes/products.ts)  
      **Commit:** `feat: rate limit product search`

- [ ] **sec-06** — Rate limit `GET /offers` and optionally `GET /products/suggest`.  
      **Files:** same as sec-05  
      **Commit:** `feat: rate limit offers and suggest`

- [ ] **sec-07** — Env-configurable rate limits (`RATE_LIMIT_*`) for prod tuning.  
      **Files:** middleware/routes, [`.env.example`](.env.example), README  
      **Commit:** `feat: configure rate limits via env`

### Database & Supabase

- [ ] **sec-08** — README: app uses **server-only** Postgres URL; no anon key in browser; tables have **no RLS** today—OK only while DB is not exposed to clients.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: database access and RLS expectations`

- [ ] **sec-09** — Local Supabase: document **Studio (54323)** and **54322** must not be exposed on a network-facing host.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: lock down local Supabase ports`

- [ ] **sec-10** — Seed safety: require explicit confirm env (e.g. `ALLOW_DB_SEED=1`) before `truncate` in seed, or refuse when `NODE_ENV=production`.  
      **Files:** [`packages/db/scripts/seed.ts`](packages/db/scripts/seed.ts), README  
      **Commit:** `feat: guard database seed against accidental prod run`

### Logging & shutdown

- [ ] **sec-11** — Optional: disable search `q=` in access logs when `LOG_SEARCH_QUERIES=0` (prod default off).  
      **Files:** [`apps/api/src/routes/products.ts`](apps/api/src/routes/products.ts), `.env.example`  
      **Commit:** `feat: optional redaction of search query logs`

- [ ] **sec-12** — On shutdown: `closePool()` from `@mrd/db` after HTTP drain (extends **prod-03**); include Redis teardown (**cache-09**).  
      **Files:** [`apps/api/src/index.ts`](apps/api/src/index.ts)  
      **Commit:** `feat: close db pool on shutdown`

### Optional / later

- [ ] **sec-13** — If using hosted Supabase with PostgREST: RLS **deny all** for `anon`/`authenticated` on catalog tables (API keeps service-style connection).  
      **Files:** new migration under [`supabase/migrations/`](supabase/migrations/)  
      **Commit:** `feat: enable RLS deny-by-default on catalog tables`

- [ ] **sec-14** — `express.json()` body size limit (until POST routes exist, low priority).  
      **Files:** [`apps/api/src/app.ts`](apps/api/src/app.ts)  
      **Commit:** `feat: limit JSON body size`

---

## Phase 4 — Docs and polish

- [x] **pol-01** — Sync **SOLUTION.md** with monorepo + DB runtime, UI (empty state, 40-cap, loading, URL validation).  
      **Files:** [`SOLUTION.md`](SOLUTION.md)  
      **Commit:** `docs: sync SOLUTION with current stack and UI`

- [ ] **pol-02** — Bump `styles.css?v*` in [`apps/web/index.html`](apps/web/index.html) after CSS changes. _(Recurring; current cache bust is `?v8`.)_  
      **Files:** `apps/web/index.html`  
      **Commit:** `chore: bump static asset cache bust`

---

## Phase 5 — Optional

- [ ] **opt-01** — Multi-stage **Dockerfile** (`pnpm build`, `pnpm start`; `USE_DATABASE=1`; include seed data for init docs only).  
      **Commit:** `chore: add Dockerfile`

- [ ] **opt-02** — Chip-style **sort** control (match category chips).  
      **Files:** `apps/web/index.html`, `apps/web/src/`, `apps/web/styles.css`  
      **Commit:** `ui: sort as segmented control`

- [ ] **opt-03** — Extend **`packages/shared`** enrichment + types (dedupe client/server). _(Partial: `Enrichment` type only in `@mrd/shared` today.)_  
      **Commit:** `refactor: shared enrichment and types`

- [ ] **opt-04** — **Playwright** smoke (search, URL normalize, sort).  
      **Commit:** `test: add e2e smoke`

- [ ] **opt-05** — Real **HTTP upstream** for offers (replace in-process simulation).  
      **Files:** [`apps/api/src/upstream.ts`](apps/api/src/upstream.ts)  
      **Commit:** `feat: HTTP offers upstream`

- [ ] **opt-06** — **Load more** or server paging when `total > 40`.  
      **Files:** [`apps/web/src/search.ts`](apps/web/src/search.ts), API usage  
      **Commit:** `feat: load results beyond 40 cap`

---

## Phase 6 — Framework branches (after Phases 1–4, 3b, 3c, and optional Phase 5)

**Start only when** production, security, caching, and doc items above are in good shape (at minimum: **data-01**, **pol-01**, **prod-01**, **sec-04**–**sec-06**, **ops-04** or equivalent runbook; **cache-01** + **ops-03** recommended).

**Goal:** Same product-search behaviour and **unchanged** [`apps/api`](apps/api) + [`packages/db`](packages/db) + [`packages/shared`](packages/shared); each **long-lived git branch** swaps the UI implementation.

| Branch                   | Stack                                       | UI location (typical)                 |
| ------------------------ | ------------------------------------------- | ------------------------------------- |
| `main` (or `ui/vanilla`) | Current vanilla TS ([`apps/web`](apps/web)) | Reference / merge target              |
| `ui/react`               | React (Vite or CRA-style in monorepo)       | `apps/web` → React app                |
| `ui/vue`                 | Vue 3                                       | `apps/web` → Vue app                  |
| `ui/angular`             | Angular                                     | `apps/web` → Angular workspace app    |
| `ui/svelte`              | Svelte (Vite + Svelte)                      | `apps/web` → Svelte app               |
| `ui/nextjs`              | Next.js (App Router)                        | `apps/web-next` or replace `apps/web` |
| `ui/nuxtjs`              | Nuxt 3                                      | `apps/web-nuxt` or replace `apps/web` |

**Rules**

- Branch from updated **`main`** (or `feature/refactor` once merged); **one framework per branch**—do not combine React + Vue on the same branch.
- Keep API contract: `GET /products`, `/offers`, `/products/categories`, `/products/suggest`, `/health` (same-origin in prod when Express serves static build; **Next/Nuxt** use dev **proxy** to `localhost:3000` and document prod split or rewrite).
- **Feature parity** with vanilla: URL keys (`q`, `category`, `sort`, `page`), `limit=40` fetch, in-memory sort/UI paging (5 rows), enrichment banners, per-card **Try again**, suggest debounce, session merge (see [`apps/web/src/`](apps/web/src/) as spec).
- Merge **API/db/shared fixes** from `main` into each `ui/*` branch regularly; resolve only UI package conflicts.

### Shared prep (one branch: `main`)

- [ ] **fw-00** — README **Framework branches**: table above, checkout workflow, parity checklist, how to run API + UI on each branch.  
      **Files:** [`README.md`](README.md)  
      **Commit:** `docs: framework branch strategy`

- [ ] **fw-01** — Move portable client types/API shapes into [`packages/shared`](packages/shared) (enrichment, product row, query params) so framework ports import one package. _(Builds on **opt-03** if done.)_  
      **Files:** `packages/shared`, vanilla `apps/web` imports  
      **Commit:** `refactor: shared client contract for UI ports`

- [ ] **fw-02** — Short **UI parity checklist** in README or `docs/ui-parity.md` (behaviour bullets from vanilla; include **client search LRU + suggest cache**; no new features required on first port).  
      **Commit:** `docs: ui parity checklist for framework branches`

### React — branch `ui/react`

- [ ] **fw-react-01** — Create branch `ui/react`; scaffold React app under `apps/web`; Turbo + root `pnpm dev` (API + web).  
      **Commit:** `feat(ui/react): scaffold React web app`

- [ ] **fw-react-02** — Port search, categories, suggest, enrichment UX, URL sync to parity checklist.  
      **Commit:** `feat(ui/react): product search parity with vanilla`

- [ ] **fw-react-03** — Branch README section: install, dev, build, how static is served with `@mrd/api`.  
      **Commit:** `docs(ui/react): run and build instructions`

### Vue — branch `ui/vue`

- [ ] **fw-vue-01** — Branch `ui/vue`; scaffold Vue 3 under `apps/web`; wire monorepo scripts.  
      **Commit:** `feat(ui/vue): scaffold Vue web app`

- [ ] **fw-vue-02** — Feature parity (search, offers retry, URL, session behaviour).  
      **Commit:** `feat(ui/vue): product search parity with vanilla`

- [ ] **fw-vue-03** — Branch README for Vue.  
      **Commit:** `docs(ui/vue): run and build instructions`

### Angular — branch `ui/angular`

- [ ] **fw-angular-01** — Branch `ui/angular`; scaffold Angular app under `apps/web`; wire monorepo scripts.  
      **Commit:** `feat(ui/angular): scaffold Angular web app`

- [ ] **fw-angular-02** — Feature parity with vanilla.  
      **Commit:** `feat(ui/angular): product search parity with vanilla`

- [ ] **fw-angular-03** — Branch README for Angular.  
      **Commit:** `docs(ui/angular): run and build instructions`

### Svelte — branch `ui/svelte`

- [ ] **fw-svelte-01** — Branch `ui/svelte`; scaffold Svelte (Vite) under `apps/web`.  
      **Commit:** `feat(ui/svelte): scaffold Svelte web app`

- [ ] **fw-svelte-02** — Feature parity with vanilla.  
      **Commit:** `feat(ui/svelte): product search parity with vanilla`

- [ ] **fw-svelte-03** — Branch README for Svelte.  
      **Commit:** `docs(ui/svelte): run and build instructions`

### Next.js — branch `ui/nextjs`

- [ ] **fw-nextjs-01** — Branch `ui/nextjs`; scaffold Next.js app (`apps/web-next` or `apps/web`); dev proxy to Express API.  
      **Commit:** `feat(ui/nextjs): scaffold Next.js app`

- [ ] **fw-nextjs-02** — Feature parity; document prod (Node API + Next standalone or combined deploy).  
      **Commit:** `feat(ui/nextjs): product search parity with vanilla`

- [ ] **fw-nextjs-03** — Branch README (dev proxy, env `API_URL`, build).  
      **Commit:** `docs(ui/nextjs): run and build instructions`

### Nuxt — branch `ui/nuxtjs`

- [ ] **fw-nuxtjs-01** — Branch `ui/nuxtjs`; scaffold Nuxt 3 app; dev proxy to Express API.  
      **Commit:** `feat(ui/nuxtjs): scaffold Nuxt app`

- [ ] **fw-nuxtjs-02** — Feature parity; document prod deploy pattern.  
      **Commit:** `feat(ui/nuxtjs): product search parity with vanilla`

- [ ] **fw-nuxtjs-03** — Branch README for Nuxt.  
      **Commit:** `docs(ui/nuxtjs): run and build instructions`

### Optional (Phase 6)

- [ ] **fw-04** — CI: workflow_dispatch or matrix job per `ui/*` branch (build only; Postgres optional/mocked).  
      **Commit:** `ci: optional framework branch builds`

- [ ] **fw-05** — Tag stable vanilla on `main` (e.g. `vanilla-v1`) before first framework branch for easy diffs.  
      **Commit:** `chore: tag vanilla reference release` _(git tag, no code)_

---

## Suggested order

1. prod-03 → prod-04 → **prod-05** (document the per-request path)
2. **sec-02**, **sec-08**, **sec-09** (docs-only, quick)
3. **sec-04** → **sec-05** → **sec-06** → **sec-07** (before a public link; replaces done **ops-02**)
4. **ops-03**, **cache-01** → **cache-03** (HTTP caching docs + headers; catalog text follows **data-01**)
5. **cache-04** → **cache-08** (Redis via Docker + cache-aside; after **prod-03**)
6. ops-04, **sec-01**, **sec-03**
7. ops-01 (compression), **sec-10**, **sec-11**, **sec-12** + **cache-09** when approaching prod deploy
8. cache-10, cache-11, sec-13, sec-14, opt-* as needed
9. **Phase 6** — after step 9 (or after step 7 if skipping optional work): **fw-00** → **fw-01** → **fw-02** → **fw-05** (optional tag) → one framework at a time (**fw-react-*** then **fw-vue-*** … order is your choice; React or Vue first is usually fastest)

**Done / N/A:** data-01, hyg-01, ops-02, pol-01, pol-03, prod-01, prod-02 (see **Already done** / superseded notes).

---

## How to use with Agent

1. Pick one unchecked **ID** above.
2. In Agent mode: _Implement **&lt;id&gt;** from TODO.md_.
3. Run tests/build, commit, check the box in this file (or in your own tracker).

Architecture and behavior details stay in [`README.md`](README.md) and [`SOLUTION.md`](SOLUTION.md)—not here.
