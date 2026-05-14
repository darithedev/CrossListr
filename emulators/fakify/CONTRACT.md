# Fakify — HTTP contract (Shopify Admin–shaped emulator)

CrossListr adapters should target **this emulator’s surface area**, not undocumented Shopify behavior. Production Shopify is **GraphQL-first** for file ingestion; this emulator implements a **narrow, tutorial-friendly slice** that matches the **mental model**: *staged upload target → raw `PUT` → `fileCreate`*.

## Base URL (Docker default)

| Listener | Host port | Purpose |
|----------|-----------|---------|
| HTTP API | `14280` (UI) / **`14282`** (API) | Admin-style routes on the Go process |

Containers on the shared integration network typically call `http://fakify-backend:8080`.

## Environment

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | Postgres DSN (**required**). |
| `FAKIFY_UPLOAD_DIR` | Writable directory for staged bytes + finalized files (default `/tmp/fakify-upload`). |
| `FAKIFY_PUBLIC_ORIGIN` | Used in **GraphQL responses** and CDN URLs (e.g. `http://127.0.0.1:14282`). If unset, URLs use the incoming request `Host`. |
| `FAKIFY_SHOPIFY_ACCESS_TOKEN` | When set, **`X-Shopify-Access-Token`** must match for `POST` GraphQL and **`PUT` staged upload**. When empty, auth is **disabled** (dev-only). |

This is **not** a real Shopify shop domain; there is no `{shop}.myshopify.com` host split in MVP.

## Shopify-pattern media (GraphQL + staged `PUT`)

Mirrors the flow described in Shopify’s Admin GraphQL docs (**`stagedUploadsCreate`** → upload bytes → **`fileCreate`** with `originalSource`).

### 1) `POST /admin/api/{version}/graphql.json`

- **Headers:** `Content-Type: application/json`; optional / required `X-Shopify-Access-Token` (see env).
- **`{version}`** is accepted for realism (e.g. `2025-04`); the emulator does **not** fork behavior by version string.

**Supported operations** (detected case-insensitively from the JSON `query` string):

#### A. `stagedUploadsCreate`

- **Variables:** `{ "input": [ { "filename", "mimeType", "httpMethod"?, ... } ] }`
- This emulator expects **exactly one** element in `input[]`.

**Response `data.stagedUploadsCreate.stagedTargets[0]` includes:**

| Field | Meaning |
|-------|---------|
| `url` | Fakify-local **`PUT`** URL for raw bytes (**not** production Google Cloud buckets). |
| `resourceUrl` | Pass to **`fileCreate`** as **`originalSource`**. Uses the staged URL shape `{scheme}{token}`, e.g. `fakify-staged://` plus a hex token (emulator-internal; not a production Shopify URL scheme). |
| `httpMethod` | `PUT` (default). |

#### B. `fileCreate`

- **Variables:** `{ "files": [ { "originalSource", "alt"?, … } ] }`
- Exactly **one** file object is supported here.
- **`originalSource`** must be the emulator’s staged URL from step A (`fakify-staged://…`) **after** the `PUT` has completed.

Returns a minimal **`MediaImage`**-shaped node with `preview.image.url` pointing at the CDN path below.

### 2) `PUT /admin/internal/staged-uploads/{token}`

- **Headers:** same access token rule as GraphQL (`X-Shopify-Access-Token`).
- **Body:** **raw bytes** for the staged file (matches the “upload to staging URL” step in Shopify tutorials; not `multipart/form-data`).
- **`204`** on success. Staging rows expire (**24 hours** TTL in Postgres).

### 3) `GET /cdn/shop/files/{id}` (and `HEAD`)

Public read of a finalized image by numeric **`fakify_media_file.id`** (what the `MediaImage` `gid` suffix encodes).

## On purpose vs production Shopify

- No shop hostname, billing, rate limits, or full GraphQL schema—only the two mutations above for media.
- No real S3/GCS presigned POST field bundle; the staged `PUT` is always same-origin to Fakify for local dev.
- **Do not** copy `fakify-staged://` URLs into production adapters; map the same *steps* to Shopify’s real `stagedUploadsCreate` + `fileCreate` docs.
