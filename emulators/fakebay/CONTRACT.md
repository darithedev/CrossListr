# FakeBay — HTTP contract (eBay sandbox–shaped emulator)

CrossListr and tests should depend on **this document**, not on undocumented eBay behavior. FakeBay may deliberately simplify; divergences are called out below.

## Base URLs (Docker defaults)

| Surface | Published host port | In-container listener | Purpose |
|--------|---------------------|----------------------|---------|
| Auth   | `14181` → `8081`    | `FAKEBAY_AUTH_ADDR`  | Authorization / browser redirect |
| API    | `14182` → `8082`    | `FAKEBAY_API_ADDR`   | Token exchange + REST (Bearer) |

On the shared integration network, other containers typically use `http://fakebay-backend:8081` (auth) and `http://fakebay-backend:8082` (API).

## Environment (OAuth client)

| Variable | Default (dev) | Meaning |
|----------|---------------|---------|
| `FAKEBAY_CLIENT_ID` | `dev-fakebay-client` | `client_id` for authorize + Basic auth user on token |
| `FAKEBAY_CLIENT_SECRET` | `dev-fakebay-secret` | Basic auth password on token |
| `FAKEBAY_ALLOWED_REDIRECT_URIS` | *(empty)* | Comma-separated **exact** `redirect_uri` values. If empty, any `http`/`https` absolute URL is allowed (emulator-only). |

## Authorization code flow

### `GET /oauth2/authorize` (auth listener)

Query parameters (subset enforced by FakeBay):

| Param | Required | Notes |
|-------|----------|-------|
| `response_type` | yes | Must be `code`. |
| `client_id` | yes | Must match `FAKEBAY_CLIENT_ID`. |
| `redirect_uri` | yes | Absolute `http` or `https` URL. Must match token step exactly. If allowlist is set, must be listed in `FAKEBAY_ALLOWED_REDIRECT_URIS`. |
| `scope` | no | Ignored for MVP (may be echoed in future). |
| `state` | no | Returned unchanged on success and on redirect-style errors. |

**Success:** HTTP 302 redirect to `redirect_uri` with query `code` (opaque, URL- and shell-safe prefix `fbac_`) and `state` (if provided).

**Errors (when `redirect_uri` is valid):** HTTP 302 to `redirect_uri` with `error`, `error_description`, and optional `state` (OAuth 2.0 style).

**Errors (no usable redirect):** HTTP 400 with JSON `error` / `error_description`.

### `POST /identity/v1/oauth2/token` (API listener)

- **Headers:** `Authorization: Basic base64(client_id:client_secret)` (must match env).
- **Body:** `application/x-www-form-urlencoded`.

**`grant_type=authorization_code`**

| Field | Required |
|-------|----------|
| `grant_type` | `authorization_code` |
| `code` | yes (from authorize redirect) |
| `redirect_uri` | yes (must match the authorize request) |

**Success JSON (shape aligned with eBay user tokens):**

```json
{
  "access_token": "v^1.1#i#...",
  "expires_in": 7200,
  "refresh_token": "v^1.1#r#...",
  "token_type": "User Access Token"
}
```

**`grant_type=refresh_token`**

| Field | Required |
|-------|----------|
| `grant_type` | `refresh_token` |
| `refresh_token` | yes |

**Success:** JSON with new `access_token`, `expires_in`, `token_type` (refresh token is not rotated in MVP).

**Error JSON:** HTTP 4xx with `error` and `error_description`, e.g. `invalid_client`, `invalid_grant`, `invalid_request`, `unsupported_grant_type`.

## Bearer-protected sample route

### `GET /api/v1/oauth/whoami` (API listener)

- **Header:** `Authorization: Bearer <access_token>` from token response.

**Success:** `200` JSON, e.g. `{ "sub": "fakebay-user", "token_type": "User Access Token", "emulator": "fakebay" }`.

**Failure:** `401` JSON with `invalid_token`.

## CORS

Both listeners send permissive dev headers (`Access-Control-Allow-Origin: *`, etc.) and answer `OPTIONS` with `204` for browser/SPA experiments.

## Health

`GET /health` on each listener returns `{"status":"ok","emulator":"fakebay"}`.
