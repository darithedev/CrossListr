# Fakify — delivery plan (Shopify-shaped emulator)

## Purpose

**Fakify** is a local **Shopify Admin API–shaped** emulator so **CrossListr** can practice **product-centric** flows (title, body/HTML, variants, price, inventory quantity) and **OAuth tied to a shop**—without a Shopify Partner app in production.

It shares the same mentoring pattern as **[FakeBay](../fakebay/)** and **[Faketsy](../faketsy/)**: small PRs, chained branches, `CONTRACT.md` on the real Shopify docs where we intentionally diverge.

**CrossListr goal:** alongside FakeBay and Faketsy, Fakify gives a **third API shape** so CrossListr can **choose how to map canonical listing fields** when the user enables **Shopify** as a destination (e.g. variants vs flat SKU, metafields later).

## Planned product scope (MVP)

- **OAuth (Shopify-flavored):** authorization redirect + token exchange yielding an **access token** scoped to a **dev shop** (emulator may use a single fixed `shop` in env for MVP).
- **Product CRUD** mimicking a thin slice of **[Admin REST `Product`](https://shopify.dev/docs/api/admin-rest/latest/resources/product)** (create/read/update/delete; simplified JSON—no full GraphQL parity required for v1).
- **Minimal order/checkout path:** e.g. create a **draft order** or simple “purchase” that decrements variant quantity—enough to contrast with FakeBay's listing purchase and Faketsy's listing sale.
- **React UI** (optional phase) for manual testing.

## Tech direction

Align with **`emulators/fakebay/`** unless Fakify needs a deliberate exception:

| Layer | Choice |
|-------|--------|
| API | **Go** in **`emulators/fakify/backend/`** |
| UI | **React** in **`emulators/fakify/frontend/`** |
| Data | **Postgres**, **internal-only** (no host publish for DB) |
| Migrations | **golang-migrate**, SQL in **`emulators/fakify/db/migrations/`**, one-shot **`emulators/fakify/db/Dockerfile`** |
| DB API | **[typedb](https://github.com/TheBlackHowling/typedb)** |
| Auth / HTTP | **Shopify-shaped** for dev: e.g. install/OAuth redirect and token endpoint documented against [Shopify OAuth](https://shopify.dev/docs/apps/auth/oauth); Admin-style routes under a path like **`/admin/api/{version}/`** with **`X-Shopify-Access-Token`** (and/or `Authorization: Bearer`) per **`CONTRACT.md`**. |

### Repo layout

```
emulators/fakify/
  compose.yaml
  db/
    Dockerfile
    migrations/
  backend/
  frontend/
  DELIVERY_PLAN.md
  CONTRACT.md   # when introduced
```

## Runtime and networking

- **`emulators/fakify/compose.yaml`**: Postgres → migrate → backend → frontend; **unique host ports** vs CrossListr, FakeBay, and Faketsy.
- Docker network name e.g. **`fakify`**; attach **`integration`** (or equivalent) when CrossListr must call Fakify by service name.
- CrossListr **never** connects to Fakify Postgres—only HTTP.

## Git workflow

Chain branches from the previous feature branch (same discipline as FakeBay). Suggested prefixes: `fy/00-scaffold`, `fy/01-health`, `fy/02-shopify-oauth`, `fy/03-products-crud`, `fy/04-order-stub`, `fy/05-fakify-ui`, `fy/06-crosslistr-stub`.

## Phased features (suggested)

| Phase | Theme | Deliverable |
|-------|--------|-------------|
| **00** | Scaffold | Compose, db/migrate image, Go + React skeleton, typedb + initial migration, README + `.env.example`. |
| **01** | Health + CORS | Health route; CORS for browser dev. |
| **02** | Shopify-shaped OAuth | Redirect + token exchange + dev shop token storage; document in `CONTRACT.md` vs [OAuth getting started](https://shopify.dev/docs/apps/auth/oauth/getting-started). |
| **03** | Products API | CRUD under Admin-style paths; simplified Product/Variant JSON; align field names to Shopify samples where practical. |
| **04** | Order stub | Minimal draft order or purchase flow; new migrations if needed. |
| **05** | UI | Browse/edit products + exercise OAuth + order path. |
| **06** | CrossListr stub | Env-driven **Fakify base URL** + token; test multi-platform switch alongside FakeBay/Faketsy. |
| **07+** | Parity | Webhooks, inventory items, GraphQL-shaped endpoints—only as needed. |

## API contract

Capture in **`CONTRACT.md`**: exact paths (`admin/api/version/...`), headers, OAuth params, error JSON, and **differences** from production Shopify (fixed shop, no billing, etc.).

## Decisions

| Topic | Decision |
|-------|----------|
| **Repository** | Same monorepo under **`emulators/fakify/`**. |
| **Ports** | Assigned at implementation; must not clash with other emulators. |
| **GraphQL vs REST** | **REST-first** for MVP (Admin REST product resource); GraphQL optional later. |

---

*Fakify — Shopify clone emulator for CrossListr multi-platform field mapping.*
