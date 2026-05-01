# FakeBay — delivery plan

## Purpose

**FakeBay** is a small, local “eBay-like” app (HTTP API + minimal browser UI) that stands in for eBay so **CrossListr** can be developed and tested against a real integration without an eBay developer account. The goal is a **narrow, stable contract** (endpoints, payloads, and auth) that CrossListr can target; FakeBay can grow feature-by-feature as CrossListr needs more behavior.

**Principles:** small, reviewable changes; one focused feature per branch; each new feature branch is cut **from the previous feature branch** so work stacks cleanly and history stays easy to follow.

**Planned product scope (MVP for FakeBay):** the API and UI should support **full listing management** (create, read, update, delete) and **purchasing a listing** (a minimal “buy” that updates listing/order state), so CrossListr can exercise listing and buyer flows without eBay.

## Tech direction

| Layer   | Choice |
|---------|--------|
| API     | **Go** in `fakebay/backend/` (HTTP server; `go.mod` alongside the API code) |
| UI      | **React** in `fakebay/frontend/` (Vite or CRA—match CrossListr’s `frontend/` conventions where practical) |
| Data    | **Postgres** (FakeBay’s own database; separate from CrossListr’s `postgres` service). **Not exposed to the host:** the FakeBay DB is reachable only from containers on the FakeBay Docker network (backend, one-shot migrate, etc.)—**no** `ports:` publish for the DB service. |
| Migrations | **[golang-migrate](https://github.com/golang-migrate/migrate)** (`go-migrate`): versioned **SQL** under **`fakebay/db/migrations/`** (kept with DB tooling, not under `backend/`). The **migration runner image** and the **SQL** share one parent, **`fakebay/db/`**: `Dockerfile` is **alongside** `migrations/`, e.g. `db/Dockerfile` + `db/migrations/`. In Docker, migrations run as a **separate one-shot step** (see below)—not embedded in the API container. For local dev without Compose, use the same `migrate` CLI against `db/migrations`; keep early schema small and additive. |
| DB API   | **[typedb](https://github.com/TheBlackHowling/typedb)** — typed database interface used from the Go backend for queries (all persistence goes through this layer, not ad hoc `database/sql` in handlers). |

### Repo layout (FakeBay)

```
fakebay/
  compose.yaml      # order: postgres → migrate → backend → frontend
  db/
    Dockerfile      # one-shot image: runs migrate against db/migrations (build context: ./db)
    migrations/     # SQL only: golang-migrate .up / .down (or equivalent)
  backend/          # Go API (schema via typedb; no SQL in backend/)
  frontend/         # React app
  DELIVER_PLAN.md
```

## Runtime: Docker Compose and networking

FakeBay runs from **`fakebay/compose.yaml`** (own Compose project, not the repo-root `docker-compose.yml`). That file defines a **dedicated network for FakeBay’s own services** (API ↔ Postgres ↔ frontend as needed). CrossListr and FakeBay are **separate application stacks**; we still need **HTTP (and env-based URLs) between them** in dev and CI.

### Startup order (Postgres → migrations → backend)

1. **Postgres** starts and becomes **healthy** (`healthcheck` + `depends_on: condition: service_healthy` where needed).
2. A **migration** service (image built from **`fakebay/db/Dockerfile`**, build context **`./db`**) runs **to completion** with the same `DATABASE_URL` the backend will use, applying everything under **`fakebay/db/migrations/`**. Use Compose’s **completed successfully** pattern so the backend does not start if migrations fail (e.g. `depends_on: { migrate: { condition: service_completed_successfully } }` on API-compatible Compose file versions).
3. **Backend** and **frontend** start after migrations succeed.

The migration image should be **minimal** (official `migrate` binary or a tiny wrapper); it copies **`db/migrations`** into the image (or bind-mounts in dev, if you standardize on one approach in README). It does not ship the Go app—only the SQL tree + migrate.

### FakeBay internal network

- Define a user-defined network (e.g. `fakebay`) and attach at minimum:
  - **FakeBay Postgres** (the migration job and the Go API both reach it by **internal** hostname, e.g. `fakebay-postgres:5432`). **Do not publish the DB port to the host**—it must remain **only** on the FakeBay network, not on `localhost` or other host interfaces.
  - **FakeBay migration** (one-shot; exits 0 on success)
  - **FakeBay Go API**
  - **FakeBay React** (dev server or static + reverse proxy, depending on scaffold)
- For services that need a browser or host tooling (API, UI), use **non-conflicting published host ports** vs. the existing stack (e.g. `3100` / `5180` for FakeBay’s HTTP surfaces). **Postgres does not get a public mapping**—ad hoc SQL access, if ever needed, is via `docker exec` or a one-off admin container on the same network, not a standing host port.

### Cross-network communication (FakeBay ↔ CrossListr)

Containers reach each other by **service DNS name** on a **shared Docker network**, not by `localhost` from inside another container. **CrossListr does not connect to FakeBay’s Postgres**—only to the **FakeBay HTTP API** (which keeps DB access private to the FakeBay stack).

**Recommended pattern**

1. **Add a second network** used only for “integration” (e.g. `integration` or `crosslistr-fakebay`), *or* attach selected services to **both** `app` (existing CrossListr network) and `fakebay`.
2. **CrossListr `backend`** (or whichever service calls FakeBay) gets an env var such as `FAKEBAY_API_URL=http://fakebay-api:8080` (hostname = Compose **service name**, port = **container** port, not the host-mapped port).
3. **Browser → API:** the React app (CrossListr or FakeBay) may call relative URLs or a public host; for server-side integration, the **Node backend** should call FakeBay using the **Docker service hostname** on the shared network.
4. **CORS:** FakeBay’s Go API must allow the CrossListr origin (or `*` in strict dev) when the browser calls FakeBay directly; if all traffic goes **server-to-server** (CrossListr backend → FakeBay), CORS is not involved for that path.

**Composing the two stacks:** run CrossListr’s `docker-compose.yml` and FakeBay’s `fakebay/compose.yaml` together, then connect them with a **user-defined external network** (both Compose files `external: true` the same network name) *or* use `docker compose` **profiles** / a thin root **override** file only if you want a one-command up—keep FakeBay’s definition authoritative in `fakebay/compose.yaml` so the boundary stays clear.

Document the chosen hostnames and ports in `fakebay`’s `README` and `.env.example` when the scaffold lands.

## Git workflow: chained feature branches

**Default workflow (what we follow):** each new feature branch is **created from the previous feature branch**, not from `main` (unless you are starting a new chain or resetting). That keeps every PR small and reviewable while stacking work in order.

- **`main`**: merge when a feature (or a batch) is done and you want the stable line updated.
- **Feature 0:** `fb/00-scaffold` from `main`.
- **Feature 1:** `fb/01-<name>` from **`fb/00-scaffold`**.
- **Feature 2:** `fb/02-<name>` from **`fb/01-<name>`** (after 01 is the tip of the chain), and so on.

When a parent PR merges to `main`, rebase or merge `main` into the child branch if needed, or retarget the next PR. Some teams merge each feature to `main` in order and then start the *next* feature from the updated `main`—that is equivalent once the parent is merged; the rule that matters is **no mixing unrelated work** and **one focused feature per branch**.

Name branches consistently, e.g. `fb/00-scaffold`, `fb/01-health`, `fb/02-auth-stub`, `fb/03-listings-crud`, `fb/04-purchase`, `fb/05-fakebay-ui`.

## Phased features (suggested order)

Each phase is intentionally **small** so one PR is reviewable. Skip or split further if a phase feels large.

| Phase | Branch theme | Deliverable (done when…) |
|-------|----------------|---------------------------|
| **00** | Scaffold | `fakebay/backend/` (Go), `fakebay/frontend/` (React), `fakebay/db/migrations/` (SQL) + `fakebay/db/Dockerfile` (migrate job), `fakebay/compose.yaml` with **Postgres → migrate (one-shot) → backend → frontend**; inter-stack doc for CrossListr; **golang-migrate** with an initial small schema; **[typedb](https://github.com/TheBlackHowling/typedb)** in `go.mod` and bootstrap; `fakebay/README` + `.env.example`. |
| **01** | Health + CORS | `GET /health` (and/or `/api/v1/health`); CORS for local dev; proves CrossListr can reach the server. |
| **02** | Auth contract | A minimal “developer token” or API-key header (e.g. `Authorization: Bearer <token>`) validated by middleware; 401/403 behavior documented. *No real eBay OAuth—just a stable shape CrossListr can code against.* |
| **03** | Listings API | **Full CRUD** for listings (create, read, update, delete): id, title, price, quantity, status; JSON only; **persisted via typedb**; **new SQL in `fakebay/db/migrations/`** as the schema grows; migration job on deploy. Split into smaller PRs if the diff gets large. |
| **04** | Purchase API | Endpoint(s) to **purchase** a listing (e.g. transition to sold, minimal order/sale record—only what a simple integration needs). **New SQL** in `db/migrations/` as required. |
| **05** | FakeBay UI | React UI for **browsing, creating/editing/deleting listings, and buying** a listing—calling the same HTTP API CrossListr will use. |
| **06** | CrossListr client stub | A thin module or env-driven base URL in CrossListr that points at FakeBay; optional smoke test or dev-only path. |
| **07+** | Parity as needed | Webhooks, pagination, images, idempotency, or fields that mirror a subset of eBay’s *surface area* you document as the contract. Add only when CrossListr needs it. |

**Rule of thumb:** if a feature’s PR is hard to review in one sitting, split it (e.g. “listings read” then “listings write/delete”, or “purchase API” before “UI purchase”).

## API contract (to lock early)

Before heavy CrossListr work, agree on a **short written contract** (can live in this folder or a `CONTRACT.md` in a later phase):

- Base path (e.g. `/api/v1/...`)
- Auth header and error shape (`{ "error": "message" }` or similar)
- Resource names and required fields for **listings** (full CRUD) and for **purchase** (request/response and resulting listing or order state)

FakeBay can diverge from real eBay on purpose; CrossListr should depend on **our** document, not on eBay’s.

## Success criteria (MVP for mentoring)

- CrossListr can point at FakeBay in development and run through flows that use the agreed contract, including **listing CRUD** and **purchase**.
- Each milestone is a **separate, small PR** with a clear name and a branch that follows the chain rule above.

## Decisions (answered)

| Topic | Decision |
|-------|----------|
| **Scope** | **Listings:** add, modify, delete, and read/list. **Purchase:** a dedicated API (and UI) path to **buy** a listing with minimal persisted state. |
| **Repository** | **Single repo** for now: FakeBay lives under `fakebay/` in this CrossListr project. |
| **Host ports** | **Set when we implement** each surface (API, UI). Document the chosen `ports:` mappings and env in `fakebay/README` and `.env.example` as we go; no fixed map in this plan. |
| **CrossListr ↔ FakeBay network** | **When implementing** the CrossListr client (phase 06): pick a **shared network** name and which services attach so the CrossListr backend can reach the FakeBay API by hostname. FakeBay’s Postgres **stays** internal to the FakeBay stack. |

---

*Last updated: scope = listing CRUD + purchase; single repo; ports TBD at implementation; Decisions section replaces open questions.*
