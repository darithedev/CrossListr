# Faketsy — HTTP contract (Etsy Open API v3–shaped emulator)

CrossListr should implement against **this document** for Faketsy, not against live Etsy without reading Etsy's own reference. Real Etsy requires API keys, OAuth approval, and stricter payload rules; Faketsy is a **dev shortcut** with **Etsy-flavored paths and headers**.

## Base URL (Docker default)

| Listener | Host port | Purpose |
|----------|-----------|---------|
| HTTP API | `14380` (UI) / **`14382`** (API) | Resource routes |

Containers on the shared integration network typically call `http://faketsy-backend:8080`.

## Environment

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | Postgres DSN (**required**). |
| `FAKETSY_UPLOAD_DIR` | Writable directory for listing image files (default `/tmp/faketsy-upload`). |
| `FAKETSY_PUBLIC_ORIGIN` | Base URL embedded in `url_fullxfull` JSON (e.g. `http://127.0.0.1:14382`). |
| `FAKETSY_API_KEY` | When set, requests must send **`X-Api-Key`** with this exact value (mirrors Etsy's **`x-api-key`** pattern). |
| `FAKETSY_ACCESS_TOKEN` | When set, requests must send **`Authorization: Bearer`** with this token. When both this and `FAKETSY_API_KEY` are unset, auth is **off** (dev-only). |

## Etsy-pattern listing image upload

### `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images`

Aligned with Etsy's tutorial flow: **multipart form** to a **shop + listing** scoped path.

- **Headers (when env auth is configured):** `X-Api-Key`, `Authorization: Bearer …` (see env table).
- **Body:** `multipart/form-data`
  - **`image`**: file part (required) — same idea as Etsy's multipart image field.
  - **`name`**: original filename (optional; defaults from part filename).
  - **`rank`**: integer position (optional; if omitted, uses `max(rank)+1` for that listing).

**Listing must exist** for the given `shop_id`. The seed migration creates:

| `shop_id` | `listing_id` | Note |
|-----------|-------------|------|
| `1` | `910001001` | Dev draft listing for image exercises |

**Success `200` JSON (simplified):**

```json
{
  "listing_id": 910001001,
  "listing_image_id": 12,
  "rank": 1,
  "url_fullxfull": "http://127.0.0.1:14382/v3/display/listing-images/12/fullxfull"
}
```

Production Etsy returns more image metadata (dims, hues, etc.); Faketsy only guarantees fields needed for **CrossListr download / re-host** practice.

**Errors:** `400` validation, `401` auth, `404` listing not found, `409` duplicate `rank` for the same listing.

### `GET /v3/display/listing-images/{listing_image_id}/fullxfull` (and `HEAD`)

Convenience **read** URL for bytes returned in `url_fullxfull`. **No auth** (public CDN-style), suitable for `<img src>` in local UIs.

## On purpose vs production Etsy

- OAuth and full listing lifecycle are **not** implemented here yet—only the **image upload path shape** your mentee needs to practice “download from user storage → re-upload to marketplace”.
- Hostname is not `openapi.etsy.com`; paths are **prefix-aligned** (`/v3/application/...`) for adapter clarity.
