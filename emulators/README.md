# Platform emulators (CrossListr)

This folder holds **local, dev-only HTTP APIs** (and optional UIs) that mimic real marketplaces so **CrossListr** can be built and tested without production credentials for every platform.

## Emulators

| Directory | Stand-in for | Goal |
|-----------|--------------|------|
| [`fakebay/`](fakebay/) | eBay (sandbox-style) | OAuth + listing CRUD + minimal purchase flow |
| [`fakify/`](fakify/) | Shopify (Admin API–style) | OAuth (per-shop token) + product CRUD + minimal order/draft flow |
| [`faketsy/`](faketsy/) | Etsy (Open API–style) | OAuth + listing CRUD + minimal purchase/transaction flow |

Each emulator has **`compose.yaml`**, **`migrations/`** (SQL + migrate image Dockerfile), **`backend/`** (Go), **`frontend/`** (React + Vite), and **`DELIVERY_PLAN.md`**.

**FakeBay OAuth (browser + token exchange):** see **[`OAUTH_DEMO.md`](OAUTH_DEMO.md)** and [`fakebay/CONTRACT.md`](fakebay/CONTRACT.md).

## Run with Docker

**All three** (requires Compose [include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/) support, Compose v2.20+):

```bash
docker compose -f emulators/compose.yaml up --build
```

**Wait until backends and frontends are healthy** — `docker compose up` exits with a non-zero status if any service with a `healthcheck` stays unhealthy (use a recent Compose v2; `--wait` is supported in v2.29+):

```bash
docker compose -f emulators/compose.yaml up --build -d --wait
```

**Smoke tests** — optional `smoke` profile: verifies `/health` bodies and HTML after services are healthy. Fails the command (exit non-zero) if any check fails:

```bash
docker compose -f emulators/compose.yaml --profile smoke run --rm fakebay-smoke
docker compose -f emulators/compose.yaml --profile smoke run --rm fakify-smoke
docker compose -f emulators/compose.yaml --profile smoke run --rm faketsy-smoke
```

From a single emulator directory:

```bash
cd emulators/fakebay
docker compose --profile smoke run --rm fakebay-smoke
```

**One emulator** (from `emulators/fakebay`, etc.):

```bash
cd emulators/fakebay
docker compose up --build
```

Postgres is **not** published to the host. Published ports:

| Emulator | Frontend | API |
|----------|----------|-----|
| FakeBay | [http://localhost:14180](http://localhost:14180) | Auth `14181`, API `14182` (`/health` on both) |
| Fakify | [http://localhost:14280](http://localhost:14280) | [http://localhost:14282/health](http://localhost:14282/health) |
| Faketsy | [http://localhost:14380](http://localhost:14380) | [http://localhost:14382/health](http://localhost:14382/health) |

Startup order per stack: **Postgres (healthy) → migrate container (exit 0) → backend (until healthy) → frontend (until healthy)**. Optional smoke containers verify responses across the Docker network.

## Shared network with CrossListr

Each emulator attaches **`backend`** and **`frontend`** to **`crosslistr-emulators-integration`** (a bridge with a fixed name). The main app's [docker-compose.yml](../docker-compose.yml) uses that network as **external** so CrossListr containers can call:

- `http://fakebay-backend:8081` / `:8082`, `http://fakebay-frontend:80`
- `http://fakify-backend:8080`, `http://fakify-frontend:80`
- `http://faketsy-backend:8080`, `http://faketsy-frontend:80`

**Emulator Postgres** stays on the emulator-only network (not on `integration`).

**Order:** bring emulators up first so the bridge exists; then `docker compose up` for CrossListr at the repo root.

**Browser** code usually still talks to **localhost** published ports (`14180`, `14280`, …) unless you proxy through CrossListr's backend.

CrossListr targets **multiple destinations**. Real platforms disagree on fields, nesting (e.g. Shopify **variants** vs eBay **inventory + offer** vs Etsy **listings**), auth shapes, and URL layout. Running **three distinct emulators** lets you:

- Implement **per-platform adapters** (or generated clients) against stable local contracts.
- Teach **canonical → platform** mapping: which CrossListr fields appear on which POST bodies for each target.
- Toggle **base URLs** (and auth) in dev to exercise branching logic without hitting production.

## CrossListr integration (high level)

- Prefer a **platform enum** (or config) → **client** interface with per-platform implementations.
- Maintain **`CONTRACT.md`** inside each emulator when APIs stabilize.

## Local dev without Docker

- **Go:** `cd emulators/<name>/backend && go run .` (ensure `DATABASE_URL` if you connect to DB).
- **Frontend:** `cd emulators/<name>/frontend && npm install && npm run dev`.
