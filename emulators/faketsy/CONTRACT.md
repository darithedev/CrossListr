# Faketsy — HTTP contract (Etsy Open API v3–shaped emulator)

CrossListr should implement against **this document** for Faketsy, not against live Etsy without reading Etsy's own reference. Real Etsy requires API keys, OAuth approval, and stricter payload rules; Faketsy is a **dev shortcut** with **Etsy-flavored paths and headers**.

## Base URLs (Docker default)

| Listener | Container port | Published (host) | Purpose |
|----------|----------------|------------------|---------|
| Auth + session + catalog | **8081** | **14381** | HTML login, `GET /oauth/connect` (PKCE), `GET/POST /api/v1/session/*`, `GET /api/v1/catalog/*` |
| API (OAuth token + resources + **`/swagger`**) | **8082** | **14382** | `POST /v3/public/oauth/token`, `GET /v3/application/users/me`, listing image routes, **`GET /openapi.yaml`**, **`GET /swagger`** |

- Shopper UI static app: **14380** (`faketsy-frontend`), not an API.
- On **crosslistr-emulators-integration**, CrossListr backend should call **`http://faketsy-backend:8082`** for Etsy-shaped resource and token routes. Use **8081** only if you need session or catalog from the app container (unusual).
- Swagger UI example: **`http://127.0.0.1:14382/swagger`** (loads **`/openapi.yaml`** from this API process; Swagger assets from **jsdelivr** CDN).

## Environment

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | Postgres DSN (**required**). |
| `FAKETSY_AUTH_ADDR` | Auth server listen address (default `:8081`). |
| `FAKETSY_API_ADDR` | API server listen address (default `:8082`). |
| `FAKETSY_UPLOAD_DIR` | Writable directory for listing image files (default `/tmp/faketsy-upload`). |
| `FAKETSY_PUBLIC_ORIGIN` | Base URL embedded in `url_fullxfull` JSON (e.g. `http://127.0.0.1:14382`). |
| `FAKETSY_UI_ORIGINS` | Comma-separated exact `Origin` values allowed for **credentialed** CORS on session/catalog (default includes `http://127.0.0.1:14380` and `http://localhost:14380`). |
| `FAKETSY_CLIENT_ID` | Registered OAuth `client_id` (default `dev-faketsy-client`). |
| `FAKETSY_CLIENT_SECRET` | When **empty**, token endpoint accepts **PKCE public** clients (`client_id` + `code_verifier` only). When **set**, callers must also authenticate with HTTP Basic (`client_id`:`client_secret`) or `client_secret` in the token body (emulator dev pattern). |
| `FAKETSY_CLIENT_DISPLAY_NAME` | Shown on OAuth consent screen (default `CrossListr`). |
| `FAKETSY_ALLOWED_REDIRECT_URIS` | Optional comma-separated exact `redirect_uri` allowlist; if empty, any `http`/`https` absolute URL is accepted. |
| `FAKETSY_ACCESS_TOKEN_TTL_SECONDS` | Access token lifetime (default `3600`). |
| `FAKETSY_REFRESH_TOKEN_TTL_SECONDS` | Refresh token lifetime (default 90 days). |
| `FAKETSY_API_KEY` | When set, **listing image upload** must send **`X-Api-Key`** with this value. |
| `FAKETSY_ACCESS_TOKEN` | When set, **listing image upload** must send **`Authorization: Bearer`** with this exact token. When both unset, upload auth is **off** (dev-only). |

## OAuth (Etsy-shaped, PKCE)

### `GET /oauth/connect` (auth listener)

Query parameters (subset aligned with Etsy-style public clients):

- **`response_type`**: must be `code`.
- **`client_id`**: must match `FAKETSY_CLIENT_ID`.
- **`redirect_uri`**: absolute `http` or `https`; must appear in `FAKETSY_ALLOWED_REDIRECT_URIS` when that env is non-empty.
- **`code_challenge`**: required (PKCE).
- **`code_challenge_method`**: must be `S256`.
- **`scope`**, **`state`**: optional; echoed on success redirect.

Requires a logged-in **browser session** (`faketsy_sid` cookie): otherwise redirects to `GET /login?return_to=…`. After approval, redirects to `redirect_uri` with `code` (and optional `state`).

### `POST /oauth/consent` (auth listener)

Form POST from consent page; **`approve`** exchanges session for stored auth code bound to PKCE challenge (internal HTML flow).

### `POST /v3/public/oauth/token` (API listener)

- **Body:** `application/json` **or** `application/x-www-form-urlencoded`.
- **`grant_type`**: `authorization_code` or `refresh_token`.
- **Authorization code grant:** `code`, `redirect_uri`, **`code_verifier`** (required), **`client_id`**. Validates PKCE (`S256`) then returns tokens.
- **Optional client auth:** When `FAKETSY_CLIENT_SECRET` is set, same request must include matching Basic credentials or body `client_secret`.

**Success (simplified)** includes `access_token`, `token_type` (`Bearer`), `expires_in`, `refresh_token`, `refresh_token_expires_in`.

### `GET /v3/application/users/me` (API listener)

Bearer `access_token` from this emulator. Response JSON includes **`user_id`**, **`primary_email`**, `token_type`, `emulator`.

## Cookie session JSON (SPA sign-in → listings)

Same-origin policy: browser calls **`http://127.0.0.1:14381`** with `credentials: 'include'` from the UI origins allowlist.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/session/login` | JSON `{ email, password }`; sets **`faketsy_sid`**. |
| `POST` | `/api/v1/session/logout` | Clears session. |
| `GET` | `/api/v1/session/me` | `{ email, userId }` or `401`. |
| `GET` | `/api/v1/session/listings` | Listings for the signed-in user’s **`default_shop_id`**. Objects use `id` ( Etsy `listing_id`), `priceCents`, RFC3339 `createdAt` / `updatedAt`, etc.

### `GET /api/v1/catalog/listings`

Public catalog (no cookie): `{ listings: [ … shopName … ] }` capped at 500 rows.

HTML **`GET /login`**, **`POST /login`**, **`GET /logout`** on the auth server mirror the same accounts.

**Demo seed:** first boot creates **`demo@faketsy.local` / `demo`** when `faketsy_users` is empty, with shop `1`.

## Etsy-pattern listing image upload

### `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images` (API listener)

- **Headers (when env auth is configured):** `X-Api-Key`, `Authorization: Bearer …` as in the env table.
- **Body:** `multipart/form-data` with **`image`** file part; optional **`name`**, **`rank`**.

Listing must exist. Seed includes:

| `shop_id` | `listing_id` | Note |
|-----------|--------------|------|
| `1` | `910001001` | Dev listing |

**Success `200` JSON (simplified):** `listing_id`, `listing_image_id`, `rank`, `url_fullxfull` (uses `FAKETSY_PUBLIC_ORIGIN`).

### `GET /v3/display/listing-images/{listing_image_id}/fullxfull` (and `HEAD`)

Public bytes for `url_fullxfull`; no OAuth.

## Production Etsy vs this emulator

- Hostnames differ; paths are chosen to mirror **OAuth token**, **authorize**, **`/v3/application/…`**, and **display image** patterns for adapters.
- Scopes are not enforced beyond echo on authorize (dev-only).

