# FakeBay — delivery plan

## Purpose

**FakeBay** is a small, local “eBay-like” app (HTTP API + minimal browser UI) that stands in for eBay so **CrossListr** can be developed and tested against a real integration without an eBay developer account. The goal is a **narrow, stable contract** (endpoints, payloads, and auth) that CrossListr can target; FakeBay can grow feature-by-feature as CrossListr needs more behavior.

FakeBay lives under **[`emulators/fakebay/`](./)** alongside **Fakify** (Shopify-shaped) and **Faketsy** (Etsy-shaped). Together they give CrossListr **three different API surfaces** so the app can learn to **pick and map fields per destination platform**. See [`../README.md`](../README.md).

**Principles:** small, reviewable changes; one focused feature per branch; each new feature branch is cut **from the previous feature branch** so work stacks cleanly and history stays easy to follow.

**Planned product scope (MVP for FakeBay):** the API and UI should support **full listing management** (create, read, update, delete) and **purchasing a listing** (a minimal “buy” that updates listing/order state), so CrossListr can exercise listing and buyer flows without eBay.

## Tech direction

| Layer   | Choice |
|---------|--------|
| API     | **Go** in **`emulators/fakebay/backend/`** (HTTP server; `go.mod` alongside the API code) |
| UI      | **React** in **`emulators/fakebay/frontend/`** (Vite or CRA—match CrossListr’s `frontend/` conventions where practical) |
| Data    | **Postgres** (FakeBay’s own database; separate from CrossListr’s `postgres` service). **Not exposed to the host:** the FakeBay DB is reachable only from containers on the FakeBay Docker network (backend, one-shot migrate, etc.)—**no** `ports:` publish for the DB service. |
| Migrations | **[golang-migrate](https://github.com/golang-migrate/migrate)** (`go-migrate`): versioned **SQL** and **`Dockerfile`** under **`emulators/fakebay/migrations/`**. In Docker, the **migrate** image runs as a **separate one-shot** service after Postgres is healthy and **before** the API starts. For local dev without Compose, point `migrate` at `migrations/*.sql`. |
| DB API   | **[typedb](https://github.com/TheBlackHowling/typedb)** — typed database interface used from the Go backend for queries (all persistence goes through this layer, not ad hoc `database/sql` in handlers). |
| Auth / HTTP surface | **eBay sandbox–shaped OAuth (dev emulator), Option A:** **one Go binary, two HTTP listeners**—an **auth** origin (`GET /oauth2/authorize`, like `auth.sandbox.ebay.com`) and an **api** origin (`POST /identity/v1/oauth2/token` plus listing/purchase APIs, like `api.sandbox.ebay.com`). CrossListr switches **base URLs** only; paths stay the same as eBay. After token exchange, resource calls use **`Authorization: Bearer <access_token>`**. Details: [eBay authorization code flow](https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html). Lock request/response fields and divergences in **`CONTRACT.md`**. |

### Repo layout (FakeBay)

```
emulators/fakebay/
  compose.yaml
  migrations/       # Dockerfile + *.sql (golang-migrate)
  backend/
  frontend/
  DELIVERY_PLAN.md
```

### eBay-shaped OAuth (dual listeners) — summary

- **Auth listener:** e.g. container port `8081` → `GET /oauth2/authorize` (query: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, …); redirects with `code` (+ `state`).
- **API listener:** e.g. `8082` → `POST /identity/v1/oauth2/token` (e.g. `grant_type=authorization_code`, **HTTP Basic** client credentials, form body per eBay); returns JSON (`access_token`, `expires_in`, `refresh_token`, …—align with eBay samples when you lock `CONTRACT.md`). Same listener also serves **listing/purchase** routes with Bearer validation.
- **Why two listeners:** matches eBay’s **two-host** model with one codebase and a **shared** in-memory or DB-backed auth-code/token store (no Nginx-only split required for MVP).

## Runtime: Docker Compose and networking

FakeBay runs from **`emulators/fakebay/compose.yaml`** (own Compose project, not the repo-root `docker-compose.yml`). That file defines a **dedicated network for FakeBay’s own services** (API ↔ Postgres ↔ frontend as needed). CrossListr and FakeBay are **separate application stacks**; we still need **HTTP (and env-based URLs) between them** in dev and CI.

### Startup order (Postgres → migrations → backend)

1. **Postgres** starts and becomes **healthy** (`healthcheck` + `depends_on: condition: service_healthy` where needed).
2. A **migration** service (image built from **`emulators/fakebay/migrations/Dockerfile`**, context **`./migrations`**) runs **to completion** with the same DSN the backend will use. Use Compose’s **completed successfully** pattern so the backend does not start if migrations fail.
3. **Backend** (both listeners) and **frontend** start after migrations succeed.

The migration image uses the official **`migrate/migrate`** image; it copies **`migrations/*.sql`** into the container. It does not ship the Go app.

### FakeBay internal network

- Define a user-defined network (e.g. `fakebay`) and attach at minimum:
  - **FakeBay Postgres** (the migration job and the Go API both reach it by **internal** hostname, e.g. `fakebay-postgres:5432`). **Do not publish the DB port to the host**—it must remain **only** on the FakeBay network, not on `localhost` or other host interfaces.
  - **FakeBay migration** (one-shot; exits 0 on success)
  - **FakeBay Go API** (single service; **two container ports** for auth vs api if using Option A)
  - **FakeBay React** (dev server or static + reverse proxy, depending on scaffold)
- For services that need a browser or host tooling (**auth listener, api listener, UI**), use **non-conflicting published host ports** vs. the existing stack **and vs. Fakify/Faketsy** when all emulators run together. **Postgres does not get a public mapping**—ad hoc SQL access, if ever needed, is via `docker exec` or a one-off admin container on the same network, not a standing host port.

### Cross-network communication (FakeBay ↔ CrossListr)

Containers reach each other by **service DNS name** on a **shared Docker network**, not by `localhost` from inside another container. **CrossListr does not connect to FakeBay’s Postgres**—only to the **FakeBay HTTP endpoints** (auth + api bases / ports).

**Recommended pattern**

1. **Add a second network** used only for “integration” (e.g. `integration` or `crosslistr-emulators`), *or* attach selected services to **both** `app` (existing CrossListr network) and `fakebay`.
2. **Env (eBay parity):** CrossListr should be able to point **auth** and **api** bases at FakeBay (same split as sandbox), e.g. `FAKEBAY_AUTH_BASE` / `FAKEBAY_API_BASE` (exact names in `README`), **or** a single hostname if you later reverse-proxy—default story is **two bases, two published ports**.
3. **Browser → API:** the React app may hit **authorize** on the auth base and **token** + REST on the api base; configure **CORS** on both listeners as needed for local dev.
4. If CrossListr’s **Node backend** proxies some calls, it should use **Docker service hostnames** and **container** ports on the shared network.

**Composing the two stacks:** run CrossListr’s `docker-compose.yml` and FakeBay’s **`emulators/fakebay/compose.yaml`** together, then connect them with a **user-defined external network** (both Compose files `external: true` the same network name) *or* use `docker compose` **profiles** / a thin root **override** file only if you want a one-command up—keep FakeBay’s definition authoritative in **`emulators/fakebay/compose.yaml`**.

Document the chosen hostnames and ports in **`emulators/fakebay/README`** and **`.env.example`** when the scaffold lands.

## Git workflow: chained feature branches

**Default workflow (what we follow):** each new feature branch is **created from the previous feature branch**, not from `main` (unless you are starting a new chain or resetting). That keeps every PR small and reviewable while stacking work in order.

- **`main`**: merge when a feature (or a batch) is done and you want the stable line updated.
- **Feature 0:** `fb/00-scaffold` from `main`.
- **Feature 1:** `fb/01-<name>` from **`fb/00-scaffold`**.
- **Feature 2:** `fb/02-<name>` from **`fb/01-<name>`** (after 01 is the tip of the chain), and so on.

When a parent PR merges to `main`, rebase or merge `main` into the child branch if needed, or retarget the next PR. Some teams merge each feature to `main` in order and then start the *next* feature from the updated `main`—that is equivalent once the parent is merged; the rule that matters is **no mixing unrelated work** and **one focused feature per branch**.

Name branches consistently, e.g. `fb/00-scaffold`, `fb/01-health`, `fb/02-ebay-oauth`, `fb/03-listings-crud`, `fb/04-purchase`, `fb/05-fakebay-ui`.

## Phased features (suggested order)

Each phase is intentionally **small** so one PR is reviewable. Skip or split further if a phase feels large.

| Phase | Branch theme | Deliverable (done when…) |
|-------|----------------|---------------------------|
| **00** | Scaffold | **`emulators/fakebay/backend/`** (Go), **`emulators/fakebay/frontend/`** (React), **`emulators/fakebay/migrations/`** (SQL + Dockerfile), **`emulators/fakebay/compose.yaml`**: **Postgres → migrate → backend → frontend**; **typedb** and richer APIs in follow-up PRs. |
| **01** | Health + CORS | **`GET /health`** on the **api** listener (and optionally the auth listener); **CORS** for local dev on the surfaces the browser hits; proves CrossListr can reach FakeBay over the network. |
| **02** | eBay-shaped OAuth | **Auth listener:** `GET /oauth2/authorize` (validate params, issue short-lived `code`, redirect to `redirect_uri` with `code` + `state`). **API listener:** `POST /identity/v1/oauth2/token` (`grant_type=authorization_code`, validate **Basic** client creds, consume code); JSON token response aligned with eBay where practical. **Resource routes** (and later listings) accept **`Authorization: Bearer`**. Dev-only clients via env/config; document errors + field names in **`CONTRACT.md`**. Split `02a`/`02b` only if the PR is too large. |
| **03** | Listings API | **Full CRUD** for listings (create, read, update, delete): id, title, price, quantity, status; JSON only; **persisted via typedb**; **new SQL in `emulators/fakebay/migrations/`** as the schema grows. Split into smaller PRs if the diff gets large. |
| **04** | Purchase API | Endpoint(s) to **purchase** a listing (e.g. transition to sold, minimal order/sale record—only what a simple integration needs). **New SQL** in `migrations/` as required. |
| **05** | FakeBay UI | React UI for **browsing, creating/editing/deleting listings, and buying** a listing—calling the same HTTP API CrossListr will use (including OAuth bases as needed). |
| **06** | CrossListr client stub | A thin module or env-driven **auth + api** base URLs in CrossListr that point at FakeBay; optional smoke test or dev-only path. |
| **07+** | Parity as needed | Refresh token / client credentials if CrossListr needs them; webhooks, pagination, images, idempotency; fields that mirror more of eBay’s surface—only as needed. |

**Rule of thumb:** if a feature’s PR is hard to review in one sitting, split it (e.g. “authorize endpoint” then “token endpoint”, or “purchase API” before “UI purchase”).

## API contract (to lock early)

Before heavy CrossListr work, agree on a **short written contract** (this folder’s **`CONTRACT.md`** in an early phase):

- **OAuth:** auth base + api base URLs; **`/oauth2/authorize`** query params; **`/identity/v1/oauth2/token`** body and **Basic** auth rules; success and error JSON shapes (compare to [eBay token exchange](https://developer.ebay.com/api-docs/static/oauth-auth-code-grant-request.html)).
- **REST:** base path for listings/purchase (e.g. `/api/v1/...`), Bearer usage on protected routes.
- Resource names and required fields for **listings** (full CRUD) and for **purchase**.

FakeBay can diverge from real eBay on purpose where documented; CrossListr should depend on **our** contract, not on undocumented eBay behavior.

## Success criteria (MVP for mentoring)

- CrossListr can point at FakeBay in development and run through flows that use the agreed contract: **OAuth (eBay-shaped)**, **listing CRUD**, and **purchase**.
- Each milestone is a **separate, small PR** with a clear name and a branch that follows the chain rule above.

## Decisions (answered)

| Topic | Decision |
|-------|----------|
| **Scope** | **Listings:** add, modify, delete, and read/list. **Purchase:** a dedicated API (and UI) path to **buy** a listing with minimal persisted state. |
| **Repository** | **Single repo** for now: emulators live under **`emulators/`** in this CrossListr project. |
| **Host ports** | **Set when we implement** each surface (auth listener, api listener, UI). Document in **`emulators/fakebay/README`** and **`.env.example`**; no fixed map in this plan. Pick ports that **do not clash** with Fakify/Faketsy or CrossListr. |
| **OAuth topology** | **Option A:** one Go binary, **two listeners** (auth vs api), shared token/code store—mirrors eBay’s two-origin model without extra reverse-proxy services for MVP. |
| **CrossListr ↔ FakeBay network** | **When implementing** the CrossListr client (phase 06): pick a **shared network** name and which services attach so the CrossListr backend/browser can reach FakeBay **auth + api** bases. FakeBay’s Postgres **stays** internal to the FakeBay stack. |

---

*Last updated: moved under `emulators/`; multi-emulator context for CrossListr field mapping.*
