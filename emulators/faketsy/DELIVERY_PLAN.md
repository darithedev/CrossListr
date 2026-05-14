# Faketsy — delivery plan (Etsy-shaped emulator)

## Purpose

**Faketsy** is a local **Etsy Open API–shaped** emulator so **CrossListr** can practice **listing** and **shop** flows with Etsy-like auth and payloads—without Etsy API approval for early development.

It sits next to **[FakeBay](../fakebay/)** (eBay-shaped) and **[Fakify](../fakify/)** (Shopify-shaped) so CrossListr can implement **platform-specific adapters** and **canonical → Etsy** field mapping when users choose **Etsy** as a posting target.

## Planned product scope (MVP)

- **OAuth 2** shaped after Etsy's public docs (authorization URL + token exchange); dev-only clients and scopes.
- **Listing CRUD** (create, read, update, delete) with a simplified payload vs production **[Etsy Open API listings](https://developers.etsy.com/documentation)** (titles, description, price, quantity, state)—enough to contrast taxonomy and fields with FakeBay/Fakify.
- **Minimal purchase / transaction** step (or cart-to-paid stub) so CrossListr can test a buyer path—scope only what mentoring needs; document gaps vs real Etsy Checkout.
- **React UI** (optional phase) for manual testing.

## Tech direction

Match **`emulators/fakebay/`** stack for consistency:

| Layer | Choice |
|-------|--------|
| API | **Go** in **`emulators/faketsy/backend/`** |
| UI | **React** in **`emulators/faketsy/frontend/`** |
| Data | **Postgres**, **internal-only** |
| Migrations | **golang-migrate**, **`emulators/faketsy/db/migrations/`**, **`emulators/faketsy/db/Dockerfile`** |
| DB API | **[typedb](https://github.com/TheBlackHowling/typedb)** |
| Auth / HTTP | **Etsy-shaped OAuth** (paths and params per Etsy docs where practical); resource routes use **Bearer** access token. If Etsy uses a **single API host** for your chosen version, mirror that in **`CONTRACT.md`**; optional second listener only if Etsy's live auth host split requires it for realism. |

### Repo layout

```
emulators/faketsy/
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

- **`emulators/faketsy/compose.yaml`**: Postgres → migrate → backend → frontend; **unique ports** vs CrossListr, FakeBay, and Fakify.
- Network e.g. **`faketsy`** + shared **`integration`** for CrossListr.
- Postgres **not** published to host.

## Git workflow

Chained feature branches; suggested prefixes: `fs/00-scaffold`, `fs/01-health`, `fs/02-etsy-oauth`, `fs/03-listings-crud`, `fs/04-purchase-stub`, `fs/05-faketsy-ui`, `fs/06-crosslistr-stub`.

## Phased features (suggested)

| Phase | Theme | Deliverable |
|-------|--------|-------------|
| **00** | Scaffold | Compose, migrate image, Go + React skeleton, typedb, README + `.env.example`. |
| **01** | Health + CORS | Health + CORS for local dev. |
| **02** | Etsy-shaped OAuth | Authorize + token endpoints; scopes and errors in `CONTRACT.md` vs [Etsy authentication](https://developers.etsy.com/documentation/essentials/authentication). |
| **03** | Listings API | Full listing CRUD; migrations as needed; simplified Etsy listing fields. |
| **04** | Purchase stub | Minimal purchase/receipt flow for mentoring. |
| **05** | UI | Browse/manage listings + exercise OAuth + purchase. |
| **06** | CrossListr stub | Env-driven **Faketsy** base URL + auth; multi-platform tests with FakeBay + Fakify. |
| **07+** | Parity | Shops, images, shipping profiles, taxonomy—only as needed. |

## API contract

**`CONTRACT.md`**: OAuth URLs/params, resource paths, listing field map vs Etsy reference docs, known simplifications.

## Decisions

| Topic | Decision |
|-------|----------|
| **Repository** | **`emulators/faketsy/`** in the same monorepo. |
| **Ports** | Set at implementation; avoid clashes with other emulators. |
| **OAuth topology** | **Single API process** unless you add a second listener to mirror Etsy's auth host split exactly; document choice in `CONTRACT.md`. |

---

*Faketsy — Etsy clone emulator for CrossListr multi-platform field mapping.*
